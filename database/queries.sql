-- HostelView read queries (SELECT only, nothing is changed). Run after schema.sql + seed.sql:
--   npm run sql database/queries.sql
USE hostelview;

-- Q1. All rows and columns of a table
SELECT * FROM colleges;

-- Q2. WHERE + ORDER BY: approved girls' hostels, best rated first
SELECT hostel_id, name, avg_rating
FROM hostels
WHERE type = 'girls' AND status = 'approved'
ORDER BY avg_rating DESC;

-- Q3. LIKE: the search box (case-insensitive)
SELECT hostel_id, name
FROM hostels
WHERE status = 'approved' AND name LIKE '%ladies%';

-- Q4. Calculated column + BETWEEN: rooms with a yearly fee from 1 to 1.5 lakh
SELECT room_id, hostel_id, room_type, capacity, is_ac, ROUND(price_per_month * 12) AS yearly_fee
FROM rooms
WHERE price_per_month * 12 BETWEEN 100000 AND 150000
ORDER BY yearly_fee;

-- Q5. DISTINCT: sharing options (students per room) offered at VIT
SELECT DISTINCT r.capacity
FROM rooms r
JOIN hostels h ON h.hostel_id = r.hostel_id
WHERE h.college_id = 1
ORDER BY r.capacity;

-- Q6. INNER JOIN: approved hostels with their college
SELECT h.hostel_id, h.name AS hostel, c.name AS college, c.city
FROM hostels h
JOIN colleges c ON c.college_id = h.college_id
WHERE h.status = 'approved'
ORDER BY c.college_id, h.name;

-- Q7. Three-table JOIN: approved reviews of hostel 1 with the author (hostel page)
SELECT r.rating, r.title, u.name AS author, h.name AS hostel
FROM reviews r
JOIN users u ON u.user_id = r.user_id
JOIN hostels h ON h.hostel_id = r.hostel_id
WHERE r.hostel_id = 1 AND r.status = 'approved';

-- Q8. LEFT JOIN + IS NULL: users who have not written any review
SELECT u.user_id, u.name, u.role
FROM users u
LEFT JOIN reviews r ON r.user_id = u.user_id
WHERE r.review_id IS NULL;

-- Q9. GROUP BY + COUNT: approved hostels per college
SELECT c.name AS college, COUNT(h.hostel_id) AS hostels
FROM colleges c
LEFT JOIN hostels h ON h.college_id = c.college_id AND h.status = 'approved'
GROUP BY c.college_id, c.name;

-- Q10. MIN / MAX / AVG: yearly fee range per college (Colleges page)
SELECT c.name AS college,
       MIN(ROUND(r.price_per_month * 12)) AS cheapest,
       MAX(ROUND(r.price_per_month * 12)) AS costliest,
       ROUND(AVG(r.price_per_month * 12)) AS average
FROM colleges c
JOIN hostels h ON h.college_id = c.college_id AND h.status = 'approved'
JOIN rooms r ON r.hostel_id = h.hostel_id
GROUP BY c.college_id, c.name;

-- Q11. SUM of a condition: AC and non-AC room types per college
SELECT c.name AS college, SUM(r.is_ac) AS ac_rooms, SUM(NOT r.is_ac) AS non_ac_rooms
FROM colleges c
JOIN hostels h ON h.college_id = c.college_id
JOIN rooms r ON r.hostel_id = h.hostel_id
GROUP BY c.college_id, c.name;

-- Q12. HAVING: hostels with at least 5 approved reviews
SELECT h.name, COUNT(*) AS reviews, ROUND(AVG(r.rating), 1) AS average
FROM hostels h
JOIN reviews r ON r.hostel_id = h.hostel_id AND r.status = 'approved'
GROUP BY h.hostel_id, h.name
HAVING COUNT(*) >= 5
ORDER BY average DESC;

-- Q13. Subquery with IN: approved hostels that have at least one AC room
SELECT hostel_id, name
FROM hostels
WHERE status = 'approved'
  AND hostel_id IN (SELECT hostel_id FROM rooms WHERE is_ac = TRUE);

-- Q14. Subquery with NOT EXISTS: approved hostels without any AC room
SELECT h.hostel_id, h.name
FROM hostels h
WHERE h.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.hostel_id = h.hostel_id AND r.is_ac = TRUE);

-- Q15. Scalar subquery: hostels rated above the average rating
SELECT name, avg_rating
FROM hostels
WHERE status = 'approved'
  AND avg_rating > (SELECT AVG(avg_rating) FROM hostels WHERE status = 'approved')
ORDER BY avg_rating DESC;

-- Q16. Correlated subquery: cheapest yearly fee of each Jadavpur hostel
SELECT h.name,
       (SELECT MIN(ROUND(r.price_per_month * 12)) FROM rooms r WHERE r.hostel_id = h.hostel_id) AS cheapest_fee
FROM hostels h
WHERE h.college_id = 4 AND h.status = 'approved';

-- Q17. EXISTS (Explore filters): hostels with an AC 2-sharing room costing at most 1,80,000 a year
SELECT h.hostel_id, h.name
FROM hostels h
WHERE h.status = 'approved'
  AND EXISTS (SELECT 1 FROM rooms r
              WHERE r.hostel_id = h.hostel_id AND r.is_ac = TRUE AND r.capacity = 2 AND r.price_per_month * 12 <= 180000);

-- Q18. JSON column: approved hostels with both a gym and Wi-Fi
SELECT hostel_id, name
FROM hostels
WHERE status = 'approved'
  AND JSON_CONTAINS(amenities, 'true', '$.gym')
  AND JSON_CONTAINS(amenities, 'true', '$.wifi');

-- Q19. Date filter: reviews written in the last 30 days
SELECT review_id, hostel_id, rating, status, DATE(created_at) AS written_on
FROM reviews
WHERE created_at >= NOW() - INTERVAL 30 DAY
ORDER BY created_at DESC;

-- Q20. UNION ALL: everything waiting in the admin moderation queue
SELECT 'hostel' AS item, hostel_id AS id, name AS summary FROM hostels WHERE status = 'pending'
UNION ALL
SELECT 'photo', photo_id, caption FROM photos WHERE status = 'pending'
UNION ALL
SELECT 'review', review_id, title FROM reviews WHERE status = 'pending';

-- Q21. VIEW: save a query under a name, use it like a table, then drop it
CREATE OR REPLACE VIEW college_summary AS
SELECT c.name AS college, COUNT(h.hostel_id) AS hostels, ROUND(AVG(h.avg_rating), 1) AS avg_rating
FROM colleges c
JOIN hostels h ON h.college_id = c.college_id AND h.status = 'approved'
GROUP BY c.college_id, c.name;
SELECT * FROM college_summary ORDER BY avg_rating DESC;
DROP VIEW college_summary;

-- Q22. EXPLAIN: MySQL uses the index idx_hostels_college_status for this filter
EXPLAIN SELECT hostel_id, name FROM hostels WHERE college_id = 1 AND status = 'approved';
