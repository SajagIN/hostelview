// hostels.avg_rating = average of APPROVED reviews; called inside the transaction that changes reviews.
export async function recomputeHostelRatings(q, hostelIds) {
  const ids = [...new Set([].concat(hostelIds).filter(Boolean))];
  if (!ids.length) return;
  await q(
    `UPDATE hostels h
        SET h.avg_rating = (SELECT COALESCE(ROUND(AVG(r.rating), 1), 0)
                              FROM reviews r
                             WHERE r.hostel_id = h.hostel_id AND r.status = 'approved')
      WHERE h.hostel_id IN (?)`,
    [ids],
  );
}
