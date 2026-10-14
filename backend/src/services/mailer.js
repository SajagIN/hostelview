// Fake email: nothing is sent. Messages are kept in memory and shown at /dev/mailbox.
const outbox = [];
let nextId = 1;

export function sendMail({ to, subject, text, meta = {} }) {
  const message = { id: nextId++, from: 'HostelView <no-reply@hostelview.local>', to, subject, text, meta, sent_at: new Date().toISOString() };
  outbox.unshift(message);
  outbox.length = Math.min(outbox.length, 100);
  console.log(`📧 Fake email to ${to}: ${subject}`);
  return message;
}

export function listMail({ to, limit = 50 } = {}) {
  const messages = to ? outbox.filter((m) => m.to.toLowerCase() === String(to).toLowerCase()) : outbox;
  return messages.slice(0, Math.min(Number(limit) || 50, 100));
}

export function clearMail() {
  outbox.length = 0;
}

export function otpEmail({ name, code, collegeName, ttlMinutes }) {
  return {
    subject: `Your HostelView verification code: ${code}`,
    text: [
      `Hi ${name},`,
      '',
      `Use this code to verify your ${collegeName} email on HostelView:`,
      '',
      `    ${code}`,
      '',
      `The code expires in ${ttlMinutes} minutes. If you did not request it, ignore this email.`,
    ].join('\n'),
  };
}
