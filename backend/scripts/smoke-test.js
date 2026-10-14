const API = process.env.API_URL || 'http://127.0.0.1:5000/api';
const ORIGIN = API.replace(/\/api$/, '');

let passed = 0;
let failed = 0;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function check(label, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  ${green('✔')} ${label}`);
  } else {
    failed++;
    console.log(`  ${red('✖')} ${label} ${extra ? dim(extra) : ''}`);
  }
}

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(API + path, { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const stamp = Date.now();
const cleanup = { users: [], hostels: [] };
let admin;

async function main() {
  console.log(`\nHostelView API smoke test → ${API}\n`);

  const health = await call('GET', '/health');
  check('health check reports MySQL connected', health.status === 200 && health.data.database.connected, JSON.stringify(health.data));
  if (health.status !== 200) throw new Error('Backend not reachable / DB down');

  console.log('\nVisitor');
  const visitor = await call('POST', '/auth/register', {
    body: { name: 'Smoke Visitor', email: `visitor${stamp}@test.local`, password: 'Visitor@123', account_type: 'visitor' },
  });
  check('register visitor → 201 + token', visitor.status === 201 && visitor.data.token);
  cleanup.users.push(visitor.data.user?.user_id);
  const vTok = visitor.data.token;
  const denied = await call('POST', '/hostels', { token: vTok, body: { name: 'Nope', type: 'boys' } });
  check('visitor cannot submit a hostel → 403', denied.status === 403, JSON.stringify(denied.data));
  const dupEmail = await call('POST', '/auth/register', {
    body: { name: 'Again', email: `visitor${stamp}@test.local`, password: 'Visitor@123' },
  });
  check('duplicate email → 409', dupEmail.status === 409);
  const badLogin = await call('POST', '/auth/login', { body: { email: `visitor${stamp}@test.local`, password: 'wrong-password' } });
  check('wrong password → 401', badLogin.status === 401);

  console.log('\nStudent + fake OTP verification');
  const collegeEmail = `student${stamp}@jaduniv.edu.in`;
  const reg = await call('POST', '/auth/register', {
    body: {
      name: 'Smoke Student',
      email: `student${stamp}@gmail.test`,
      password: 'Student@123',
      account_type: 'student',
      college_id: 4,
      college_email: collegeEmail,
    },
  });
  check('register student → OTP "sent"', reg.status === 201 && reg.data.otp?.sent_to === collegeEmail, JSON.stringify(reg.data));
  check('dev_otp returned in fake mode', /^\d{6}$/.test(reg.data.otp?.dev_otp || ''));
  cleanup.users.push(reg.data.user?.user_id);
  let sTok = reg.data.token;
  check('new student is not verified yet', reg.data.user?.is_verified === false);

  const mailbox = await call('GET', `/dev/mailbox?to=${encodeURIComponent(collegeEmail)}`);
  check('dev mailbox contains the OTP email', mailbox.data.messages?.[0]?.meta?.code === reg.data.otp?.dev_otp);

  const early = await call('POST', '/hostels', { token: sTok, body: { name: 'Too Early', type: 'boys' } });
  check('unverified student cannot submit → 403', early.status === 403);
  const resend = await call('POST', '/auth/verification/send', { token: sTok, body: {} });
  check('resend inside cooldown → 429', resend.status === 429);
  const wrong = await call('POST', '/auth/verification/confirm', { token: sTok, body: { code: reg.data.otp.dev_otp === '000000' ? '111111' : '000000' } });
  check('wrong OTP → 400 with attempts left', wrong.status === 400 && /attempt/.test(wrong.data.error.message), JSON.stringify(wrong.data));
  const ok = await call('POST', '/auth/verification/confirm', { token: sTok, body: { code: reg.data.otp.dev_otp } });
  check('correct OTP → verified student', ok.status === 200 && ok.data.user.is_verified && ok.data.user.role === 'student', JSON.stringify(ok.data));
  sTok = ok.data.token;

  console.log('\nContributions (saved as PENDING)');
  const other = await call('POST', '/hostels', { token: sTok, body: { college_id: 1, name: 'Wrong College', type: 'boys' } });
  check('cannot add a hostel for another college → 403', other.status === 403);
  const invalid = await call('POST', '/hostels', { token: sTok, body: { name: 'X', type: 'palace' } });
  check('validation error → 400', invalid.status === 400, JSON.stringify(invalid.data));
  const created = await call('POST', '/hostels', {
    token: sTok,
    body: {
      name: `Smoke Test Hostel ${stamp}`,
      type: 'coed',
      address: 'Test Road, Kolkata',
      amenities: ['wifi', 'veg_mess', 'Swimming pool'],
      rooms: [
        { room_type: 'Double', capacity: 2, is_ac: true, floor_no: 1, price_per_year: 150000, availability: 2 },
        { room_type: 'single', capacity: 1, floor_no: '', price_per_month: '9900', availability: '0' },
      ],
    },
  });
  check('submit hostel with 2 rooms → pending', created.status === 201 && created.data.status === 'pending', JSON.stringify(created.data));
  const hostelId = created.data.hostel_id;
  cleanup.hostels.push(hostelId);

  const anon = await call('GET', `/hostels/${hostelId}`);
  check('pending hostel hidden from the public → 404', anon.status === 404);
  const own = await call('GET', `/hostels/${hostelId}`, { token: sTok });
  check('submitter can see own pending hostel', own.status === 200 && own.data.hostel.rooms.length === 2);
  check('amenities normalised to JSON keys', own.data.hostel?.amenities?.swimming_pool === true && own.data.hostel?.amenities?.wifi === true);
  const acRoom = own.data.hostel?.rooms?.find((r) => r.capacity === 2);
  const plainRoom = own.data.hostel?.rooms?.find((r) => r.capacity === 1);
  check(
    'room is_ac + yearly fee stored (₹1,50,000/yr → 12500/month)',
    acRoom?.is_ac === true && acRoom?.price_per_month === 12500 && plainRoom?.is_ac === false,
    JSON.stringify(own.data.hostel?.rooms),
  );
  const noPrice = await call('POST', `/hostels/${hostelId}/rooms`, { token: sTok, body: { room_type: 'triple', capacity: 3 } });
  check('room without any fee → 400', noPrice.status === 400 && /fee/i.test(noPrice.data.error?.message || ''), JSON.stringify(noPrice.data));
  const roomId = own.data.hostel?.rooms?.[0]?.room_id;

  const form = new FormData();
  form.append('photo', new Blob([PNG], { type: 'image/png' }), 'room.png');
  form.append('caption', 'Smoke test photo');
  form.append('room_id', String(roomId));
  const photo = await call('POST', `/hostels/${hostelId}/photos`, { token: sTok, form });
  check('photo upload → pending', photo.status === 201 && photo.data.photo.status === 'pending', JSON.stringify(photo.data));
  const file = await fetch(ORIGIN + photo.data.photo?.url);
  check('uploaded file is served from /uploads', file.status === 200);

  const badType = new FormData();
  badType.append('photo', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt');
  const rejectedUpload = await call('POST', `/hostels/${hostelId}/photos`, { token: sTok, form: badType });
  check('non-image upload rejected → 400', rejectedUpload.status === 400);

  const review = await call('POST', `/hostels/${hostelId}/reviews`, {
    token: sTok,
    body: { rating: 4, title: 'Nice place', comment: 'Clean rooms and friendly staff, mess is okay.' },
  });
  check('review → pending', review.status === 201 && review.data.status === 'pending', JSON.stringify(review.data));
  const dupReview = await call('POST', `/hostels/${hostelId}/reviews`, {
    token: sTok,
    body: { rating: 2, comment: 'Second review for the same hostel' },
  });
  check('second hostel-level review → 409', dupReview.status === 409);
  const badRating = await call('POST', `/hostels/${hostelId}/reviews`, { token: sTok, body: { rating: 9, comment: 'Out of range rating' } });
  check('rating outside 1–5 → 400', badRating.status === 400);

  console.log('\nAdmin moderation');
  const login = await call('POST', '/auth/login', { body: { email: 'admin@hostelview.io', password: 'Admin@123' } });
  check('admin login', login.status === 200 && login.data.user.role === 'admin');
  admin = login.data.token;
  const forbiddenAdmin = await call('GET', '/admin/stats', { token: sTok });
  check('student cannot open admin API → 403', forbiddenAdmin.status === 403);
  const counts = await call('GET', '/admin/moderation/counts', { token: admin });
  check('pending counts include the new items', counts.data.hostels >= 1 && counts.data.photos >= 1 && counts.data.reviews >= 1, JSON.stringify(counts.data));
  const queue = await call('GET', '/admin/moderation/hostels?status=pending', { token: admin });
  check('hostel appears in the moderation queue', queue.data.items.some((h) => h.hostel_id === hostelId));

  const a1 = await call('PATCH', `/admin/moderation/hostels/${hostelId}`, { token: admin, body: { status: 'approved' } });
  const a2 = await call('PATCH', `/admin/moderation/photos/${photo.data.photo.photo_id}`, { token: admin, body: { status: 'approved' } });
  const a3 = await call('PATCH', `/admin/moderation/reviews/${review.data.review_id}`, { token: admin, body: { status: 'approved' } });
  check('approve hostel, photo and review', a1.status === 200 && a2.status === 200 && a3.status === 200);

  const pub = await call('GET', `/hostels/${hostelId}`);
  check('approved hostel is public', pub.status === 200);
  check('avg_rating recomputed to 4.0', pub.data.hostel?.avg_rating === 4, `got ${pub.data.hostel?.avg_rating}`);
  check('approved photo + review visible', pub.data.hostel?.photos.length === 1 && pub.data.hostel?.reviews.length === 1);

  const rej = await call('POST', '/admin/moderation/reviews/bulk', { token: admin, body: { ids: [review.data.review_id], status: 'rejected' } });
  const after = await call('GET', `/hostels/${hostelId}`);
  check('bulk reject → rating back to 0', rej.status === 200 && after.data.hostel?.avg_rating === 0, `got ${after.data.hostel?.avg_rating}`);

  const editApproved = await call('PUT', `/hostels/${hostelId}`, { token: sTok, body: { name: 'Renamed', type: 'coed' } });
  check('student cannot edit an approved hostel → 403', editApproved.status === 403);

  const search = await call('GET', `/hostels?q=${encodeURIComponent(`Smoke Test Hostel ${stamp}`)}&amenities=swimming_pool`);
  check('approved hostel found by search + custom amenity', search.data.total === 1);
  const q = encodeURIComponent(`Smoke Test Hostel ${stamp}`);
  const acMatch = await call('GET', `/hostels?q=${q}&ac=ac&sharing=2&max_fee=150000`);
  const acMiss = await call('GET', `/hostels?q=${q}&ac=ac&sharing=1`);
  check(
    'room filters (AC + 2-sharing + yearly budget) match the same room',
    acMatch.data.total === 1 && Math.round(acMatch.data.hostels[0].match_min_price * 12) === 150000 && acMiss.data.total === 0,
    JSON.stringify({ match: acMatch.data.total, miss: acMiss.data.total }),
  );

  const users = await call('GET', `/admin/users?q=${stamp}`, { token: admin });
  check('admin user search', users.data.users.length === 2);
  const demote = await call('PATCH', `/admin/users/${cleanup.users[1]}`, { token: admin, body: { role: 'visitor' } });
  const me = await call('GET', '/auth/me', { token: sTok });
  check('role change applies immediately (RBAC reads DB)', demote.status === 200 && me.data.user.role === 'visitor' && me.data.user.is_verified === false);

  const meta = await call('GET', '/meta');
  check('meta lists amenities + MySQL version', meta.data.amenities.length > 10 && /^8\.0\./.test(meta.data.database.version));
  const colleges = await call('GET', '/colleges');
  check(
    'college comparison numbers (fee range, AC/non-AC, sharing)',
    colleges.data.colleges.length >= 4 && colleges.data.colleges.every((c) => Array.isArray(c.sharing) && 'min_ac_price' in c),
  );
}

async function doCleanup() {
  if (!admin) return;
  for (const id of cleanup.hostels.filter(Boolean)) await call('DELETE', `/hostels/${id}`, { token: admin });
  for (const id of cleanup.users.filter(Boolean)) await call('DELETE', `/admin/users/${id}`, { token: admin });
  console.log(dim('\n  (temporary test data removed)'));
}

try {
  await main();
} catch (err) {
  failed++;
  console.error(red(`\n✖ ${err.message}`));
} finally {
  await doCleanup().catch(() => {});
  console.log(`\n${failed ? red(`${failed} failed`) : green('all passed')} — ${passed} passed\n`);
  process.exitCode = failed ? 1 : 0;
}
