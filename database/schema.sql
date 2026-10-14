-- HostelView schema (MySQL 8.0). Run this first, then seed.sql.
-- Re-running it drops the 6 tables and creates them again (empty).

CREATE DATABASE IF NOT EXISTS hostelview CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostelview;

DROP TABLE IF EXISTS reviews, photos, rooms, hostels, users, colleges;

CREATE TABLE colleges (
  college_id INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  city       VARCHAR(60)  NOT NULL,
  state      VARCHAR(60)  NOT NULL,
  website    VARCHAR(150),
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('visitor', 'student', 'admin') NOT NULL DEFAULT 'visitor',
  college_email VARCHAR(150),
  is_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
  college_id    INT,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_users_email (email),
  KEY idx_users_college (college_id),
  KEY idx_users_role (role),
  CONSTRAINT fk_users_college FOREIGN KEY (college_id) REFERENCES colleges (college_id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE hostels (
  hostel_id    INT AUTO_INCREMENT PRIMARY KEY,
  college_id   INT          NOT NULL,
  name         VARCHAR(150) NOT NULL,
  type         ENUM('boys', 'girls', 'coed') NOT NULL,
  address      TEXT,
  amenities    JSON,
  avg_rating   DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  submitted_by INT          NOT NULL,
  status       ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NULL,
  KEY idx_hostels_college_status (college_id, status),
  KEY idx_hostels_rating (avg_rating),
  KEY idx_hostels_submitted_by (submitted_by),
  CONSTRAINT chk_hostels_avg_rating CHECK (avg_rating BETWEEN 0 AND 5),
  CONSTRAINT fk_hostels_college FOREIGN KEY (college_id) REFERENCES colleges (college_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_hostels_submitted_by FOREIGN KEY (submitted_by) REFERENCES users (user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE rooms (
  room_id         INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id       INT          NOT NULL,
  room_type       VARCHAR(50)  NOT NULL,
  capacity        INT          NOT NULL,
  is_ac           BOOLEAN      NOT NULL DEFAULT FALSE,
  floor_no        INT,
  price_per_month DECIMAL(8,2) NOT NULL,
  availability    INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rooms_hostel (hostel_id),
  CONSTRAINT chk_rooms_capacity CHECK (capacity > 0),
  CONSTRAINT chk_rooms_price CHECK (price_per_month >= 0),
  CONSTRAINT chk_rooms_availability CHECK (availability >= 0),
  CONSTRAINT fk_rooms_hostel FOREIGN KEY (hostel_id) REFERENCES hostels (hostel_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE photos (
  photo_id    INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id   INT          NOT NULL,
  room_id     INT,
  url         VARCHAR(255) NOT NULL,
  caption     VARCHAR(200),
  uploaded_by INT          NOT NULL,
  status      ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_photos_hostel_status (hostel_id, status),
  KEY idx_photos_room (room_id),
  KEY idx_photos_uploaded_by (uploaded_by),
  CONSTRAINT fk_photos_hostel FOREIGN KEY (hostel_id) REFERENCES hostels (hostel_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_photos_room FOREIGN KEY (room_id) REFERENCES rooms (room_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_photos_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE reviews (
  review_id  INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id  INT          NOT NULL,
  room_id    INT,
  user_id    INT          NOT NULL,
  rating     INT          NOT NULL,
  title      VARCHAR(150),
  comment    TEXT,
  status     ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reviews_hostel_status (hostel_id, status),
  KEY idx_reviews_room (room_id),
  KEY idx_reviews_user (user_id),
  KEY idx_reviews_rating (rating),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_reviews_hostel FOREIGN KEY (hostel_id) REFERENCES hostels (hostel_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_room FOREIGN KEY (room_id) REFERENCES rooms (room_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
