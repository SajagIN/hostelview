export function serializeUser(row) {
  if (!row) return null;
  return {
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    college_email: row.college_email,
    is_verified: Boolean(row.is_verified),
    college_id: row.college_id,
    college_name: row.college_name ?? null,
    created_at: row.created_at,
  };
}

export function serializeHostelSummary(row) {
  return {
    hostel_id: row.hostel_id,
    name: row.name,
    type: row.type,
    address: row.address,
    amenities: row.amenities ?? {},
    avg_rating: Number(row.avg_rating),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    submitted_by: row.submitted_by,
    college: { college_id: row.college_id, name: row.college_name, city: row.city, state: row.state },
    min_price: row.min_price ?? null,
    max_price: row.max_price ?? null,
    room_count: Number(row.room_count ?? 0),
    ac_room_count: Number(row.ac_room_count ?? 0),
    non_ac_room_count: Number(row.room_count ?? 0) - Number(row.ac_room_count ?? 0),
    min_ac_price: row.min_ac_price ?? null,
    min_non_ac_price: row.min_non_ac_price ?? null,
    sharing: parseSharing(row.sharing),
    ...(row.match_min_price !== undefined ? { match_min_price: row.match_min_price } : {}),
    free_beds: Number(row.free_beds ?? 0),
    total_capacity: Number(row.total_capacity ?? 0),
    review_count: Number(row.review_count ?? 0),
    photo_count: Number(row.photo_count ?? 0),
    cover_url: row.cover_url ?? null,
  };
}

// GROUP_CONCAT(DISTINCT capacity) "1,2,4" → [1, 2, 4]
export function parseSharing(value) {
  return value ? String(value).split(',').map(Number).filter((n) => n > 0) : [];
}

export const serializeRoom = (row) => ({ ...row, is_ac: Boolean(row.is_ac) });
