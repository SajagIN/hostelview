-- HostelView write operations: INSERT / SELECT / UPDATE / DELETE on all 6 tables, constraint checks,
-- ON DELETE SET NULL / RESTRICT / CASCADE and transactions. Run after schema.sql + seed.sql:
--   npm run sql database/crud.sql
-- It removes everything it adds, so the sample data is the same afterwards.
-- Statements marked "fails on purpose" show MySQL rejecting bad data.
USE hostelview;

-- 1. colleges: C R U D (admin "Colleges" page)
INSERT INTO colleges (name, city, state, website) VALUES ('Demo College', 'Bhopal', 'Madhya Pradesh', 'https://example.org');
SET @college = LAST_INSERT_ID();
SELECT * FROM colleges WHERE college_id = @college;
UPDATE colleges SET website = 'https://demo-college.example.org' WHERE college_id = @college;
SELECT college_id, name, website FROM colleges WHERE college_id = @college;
DELETE FROM colleges WHERE college_id = @college;
SELECT COUNT(*) AS demo_college_left FROM colleges WHERE college_id = @college;

-- 2. users: C (Register page; the hash is bcrypt of Visitor@123), R, U (OTP verified → student of VIT)
INSERT INTO users (name, email, password_hash)
VALUES ('Demo User', 'demo.user@example.com', '$2b$10$6REfGwmLfA6/fkqQWVwDZ.CJrgCKb3bsD401wOicaAPkCcmkreRtq');
SET @user = LAST_INSERT_ID();
SELECT user_id, name, email, role, is_verified, college_id FROM users WHERE user_id = @user;
UPDATE users SET role = 'student', is_verified = TRUE, college_id = 1, college_email = 'demo.user@vitstudent.ac.in' WHERE user_id = @user;
SELECT u.user_id, u.name, u.role, u.is_verified, c.name AS college FROM users u JOIN colleges c ON c.college_id = u.college_id WHERE u.user_id = @user;

-- 3. hostels: C (student submits → status is 'pending' by DEFAULT), R, U (admin approves)
INSERT INTO hostels (college_id, name, type, address, amenities, submitted_by)
VALUES (1, 'Demo Hostel', 'boys', 'VIT Vellore campus', '{"wifi": true, "gym": true}', @user);
SET @hostel = LAST_INSERT_ID();
SELECT hostel_id, name, type, status, avg_rating, amenities FROM hostels WHERE hostel_id = @hostel;
UPDATE hostels SET status = 'approved', updated_at = NOW() WHERE hostel_id = @hostel;
SELECT hostel_id, name, status, updated_at FROM hostels WHERE hostel_id = @hostel;

-- 4. rooms: C (AC 2-sharing, 1,50,000 a year), R, U (a bed is booked)
INSERT INTO rooms (hostel_id, room_type, capacity, is_ac, floor_no, price_per_month, availability)
VALUES (@hostel, 'double', 2, TRUE, 3, 150000 / 12, 4);
SET @room = LAST_INSERT_ID();
UPDATE rooms SET availability = availability - 1 WHERE room_id = @room;
SELECT room_id, room_type, capacity, is_ac, ROUND(price_per_month * 12) AS yearly_fee, availability FROM rooms WHERE room_id = @room;

-- 5. photos: C (upload → pending), U (admin approves), R
INSERT INTO photos (hostel_id, room_id, url, caption, uploaded_by) VALUES (@hostel, @room, '/uploads/seed/ai-lobby.jpg', 'Demo photo', @user);
SET @photo = LAST_INSERT_ID();
UPDATE photos SET status = 'approved' WHERE photo_id = @photo;
SELECT photo_id, hostel_id, room_id, caption, status FROM photos WHERE photo_id = @photo;

-- 6. reviews: C (pending), then U in ONE transaction: approve + recompute avg_rating (what the admin page does)
INSERT INTO reviews (hostel_id, room_id, user_id, rating, title, comment) VALUES (@hostel, @room, @user, 4, 'Nice room', 'Clean room and fast Wi-Fi.');
SET @review = LAST_INSERT_ID();
START TRANSACTION;
UPDATE reviews SET status = 'approved' WHERE review_id = @review;
UPDATE hostels SET avg_rating = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE hostel_id = @hostel AND status = 'approved') WHERE hostel_id = @hostel;
COMMIT;
SELECT h.name, h.avg_rating, r.rating, r.status FROM hostels h JOIN reviews r ON r.hostel_id = h.hostel_id WHERE h.hostel_id = @hostel;

-- 7. Constraints (every statement here fails on purpose)
-- PRIMARY KEY: id 1 already exists
INSERT INTO colleges (college_id, name, city, state) VALUES (1, 'Copy', 'Vellore', 'Tamil Nadu');
-- UNIQUE: the email is already registered
INSERT INTO users (name, email, password_hash) VALUES ('Copy', 'admin@hostelview.io', 'x');
-- NOT NULL: a hostel needs a name
INSERT INTO hostels (college_id, name, type, submitted_by) VALUES (1, NULL, 'boys', 1);
-- ENUM: type must be boys, girls or coed
INSERT INTO hostels (college_id, name, type, submitted_by) VALUES (1, 'Bad type', 'mixed', 1);
-- CHECK: rating must be 1 to 5
INSERT INTO reviews (hostel_id, user_id, rating) VALUES (1, 2, 6);
-- CHECK: capacity must be more than 0
UPDATE rooms SET capacity = 0 WHERE room_id = 1;
-- FOREIGN KEY: college 99 does not exist
INSERT INTO hostels (college_id, name, type, submitted_by) VALUES (99, 'Ghost Hostel', 'boys', 1);
-- FOREIGN KEY ON DELETE RESTRICT: a college that still has hostels cannot be deleted
DELETE FROM colleges WHERE college_id = 1;
-- JSON: amenities must be valid JSON
UPDATE hostels SET amenities = 'wifi, gym' WHERE hostel_id = 1;

-- 8. Deletes and what the foreign keys do
DELETE FROM photos WHERE photo_id = @photo;
-- ON DELETE SET NULL: deleting the room keeps the review but its room_id becomes NULL
DELETE FROM rooms WHERE room_id = @room;
SELECT review_id, hostel_id, room_id FROM reviews WHERE review_id = @review;
DELETE FROM reviews WHERE review_id = @review;
-- ON DELETE RESTRICT (fails on purpose): the user still owns a hostel
DELETE FROM users WHERE user_id = @user;
DELETE FROM hostels WHERE hostel_id = @hostel;
DELETE FROM users WHERE user_id = @user;
SELECT (SELECT COUNT(*) FROM users WHERE user_id = @user) AS demo_user_left, (SELECT COUNT(*) FROM hostels WHERE hostel_id = @hostel) AS demo_hostel_left;

-- 9. ON DELETE CASCADE inside a transaction, then ROLLBACK brings everything back
SELECT (SELECT COUNT(*) FROM rooms WHERE hostel_id = 1) AS rooms, (SELECT COUNT(*) FROM photos WHERE hostel_id = 1) AS photos, (SELECT COUNT(*) FROM reviews WHERE hostel_id = 1) AS reviews;
START TRANSACTION;
DELETE FROM hostels WHERE hostel_id = 1;
SELECT (SELECT COUNT(*) FROM rooms WHERE hostel_id = 1) AS rooms, (SELECT COUNT(*) FROM photos WHERE hostel_id = 1) AS photos, (SELECT COUNT(*) FROM reviews WHERE hostel_id = 1) AS reviews;
ROLLBACK;
SELECT (SELECT COUNT(*) FROM rooms WHERE hostel_id = 1) AS rooms, (SELECT COUNT(*) FROM photos WHERE hostel_id = 1) AS photos, (SELECT COUNT(*) FROM reviews WHERE hostel_id = 1) AS reviews;

-- 10. ON UPDATE CASCADE: changing a college id also changes it in hostels and users (rolled back)
START TRANSACTION;
UPDATE colleges SET college_id = 40 WHERE college_id = 4;
SELECT (SELECT COUNT(*) FROM hostels WHERE college_id = 40) AS hostels_now_40, (SELECT COUNT(*) FROM users WHERE college_id = 40) AS users_now_40;
ROLLBACK;
SELECT college_id, name FROM colleges WHERE college_id = 4;

-- 11. The sample data is unchanged
SELECT (SELECT COUNT(*) FROM colleges) AS colleges, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM hostels) AS hostels,
       (SELECT COUNT(*) FROM rooms) AS rooms, (SELECT COUNT(*) FROM photos) AS photos, (SELECT COUNT(*) FROM reviews) AS reviews;
