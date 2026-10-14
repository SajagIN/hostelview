# HostelView

Verified college hostel information: room types, yearly fees, photos and student reviews for **VIT Vellore, SRM KTR (Chennai), MIT Manipal and Jadavpur University**.

**Stack:** React (Vite + Tailwind) → Node.js + Express REST API (JWT login, roles, moderation queue) → **MySQL 8.0**.
Everything runs on your computer: MySQL is downloaded by npm, photos are stored in `backend/uploads`, and the email OTP is simulated.

*Database Systems project · SCOPE, VIT Vellore · 2026 · Mridhul K (25BCE0842), Sajag K (25BCE0910), Tharun M (25BCE2313)*

---

## 1. Run it

You only need **Node.js 18.18 or newer**. You don't need to install MySQL or anything else.

```bash
npm install
npm start
```

Open **http://localhost:5000**. Stop the app with **Ctrl+C**, which also stops MySQL.

What `npm start` does:

1. Builds the React app, but only if a file in `frontend/` changed since the last build.
2. Starts MySQL 8.0 on `127.0.0.1:3307`. The first start downloads it once (about 60 MB on Linux, 240 MB on Windows), so it needs internet.
3. Loads `database/schema.sql` + `database/seed.sql` if the database is empty **or if either file changed** since it was last loaded.
4. Starts the website and the API on port 5000.

## 2. The 4 npm scripts

| Command | What it does |
|---|---|
| `npm start` | Runs the whole app (website + API + MySQL). |
| `npm run sql` | Opens a `mysql>` prompt on the HostelView database. Type SQL ending with `;`, `source <file>` runs a file, `exit` quits. |
| `npm run sql database/queries.sql` | Runs a `.sql` file and prints every statement with its result, like the real `mysql` client. It keeps going after an error. |
| `npm run db:reset` | Runs `schema.sql` and then `seed.sql`, which brings back fresh sample data. |
| `npm test` | 43 automatic checks of the REST API. Start the app first; the test cleans up after itself. |

`npm run sql` and `db:reset` work whether the app is running or not. Use a second terminal while `npm start` runs.

## 3. Demo accounts

| Email | Password | Role |
|---|---|---|
| `admin@hostelview.io` | `Admin@123` | Admin (moderates everything) |
| `priya.demo@vitstudent.ac.in` | `Student@123` | Verified student, VIT Vellore |
| `rahul.demo@srmist.edu.in` | `Student@123` | Verified student, SRM KTR |
| `varun.demo@learner.manipal.edu` | `Student@123` | Verified student, MIT Manipal |
| `souvik.demo@jaduniv.edu.in` | `Student@123` | Verified student, Jadavpur University |
| `vikram.demo@srmist.edu.in` | `Student@123` | Student who has **not verified** yet (use it for the OTP demo) |
| `sneha.patel@example.com` | `Visitor@123` | Visitor (read-only) |

Every other `*.demo@…` student also uses `Student@123`.

## 4. Project structure

```
hostelview/
├── package.json              one package, 4 scripts
├── database/                 all SQL (section 5)
│   ├── hostelview.dbml       design → ER diagram
│   ├── schema.sql            CREATE TABLE (6 tables)
│   ├── seed.sql              sample data (INSERT)
│   ├── queries.sql           22 read queries (SELECT)
│   └── crud.sql              INSERT / UPDATE / DELETE on every table, constraints, cascades, transactions
├── backend/
│   ├── src/
│   │   ├── server.js         starts everything (npm start)
│   │   ├── app.js            Express: /api routes, photos, the built React app
│   │   ├── config.js         ports, JWT, OTP and moderation settings
│   │   ├── mysql.js          downloads, starts and stops the local MySQL 8.0 server
│   │   ├── db.js             connection pool, query helpers, transactions, loading schema.sql + seed.sql
│   │   ├── routes/           REST API, one file per module (the SQL the app runs is here)
│   │   ├── middleware/       login check (JWT + roles), photo upload
│   │   ├── services/         fake mailer, OTP codes, permission rules, rating recalculation
│   │   └── utils/            validation, error messages, JSON shapes, amenity list
│   ├── scripts/
│   │   ├── sql.js            npm run sql / npm run db:reset
│   │   └── smoke-test.js     npm test
│   └── uploads/              seed/ = bundled photos (+ CREDITS.md), photos/ = photos uploaded in the app
├── frontend/                 React app (src/pages, src/components, …)
└── docs/screenshots/
```

## 5. The SQL files: what each one is for and how they connect

```
hostelview.dbml ──► schema.sql ──► seed.sql ──┬──► queries.sql   (read only)
   design / ER      6 tables,      sample     └──► crud.sql      (writes, then cleans up)
   diagram          constraints    rows
```

| File | Contains | Run it with | Needs first |
|---|---|---|---|
| `hostelview.dbml` | The design: tables, columns, keys, indexes and relationships. Not executable SQL. | Paste it into https://dbdiagram.io to draw the ER diagram. | – |
| `schema.sql` | **DDL**: `CREATE DATABASE`, then `DROP TABLE` + `CREATE TABLE` for the 6 tables, with primary keys, foreign keys (with `ON DELETE` / `ON UPDATE` rules), `UNIQUE`, `CHECK`, `ENUM`, `DEFAULT` and indexes. It's the DBML design written as SQL. | `npm run sql database/schema.sql` | – |
| `seed.sql` | **DML**: one multi-row `INSERT` per table, in parent → child order (colleges → users → hostels → rooms → photos → reviews), then an `UPDATE` that calculates each hostel's `avg_rating` from its approved reviews. | `npm run sql database/seed.sql` | `schema.sql` |
| `queries.sql` | 22 `SELECT` queries: filters, joins, `GROUP BY` / `HAVING`, subqueries (`IN`, `EXISTS`, `NOT EXISTS`, scalar, correlated), `UNION`, JSON, a `VIEW` and `EXPLAIN`. Nothing is changed. | `npm run sql database/queries.sql` | `seed.sql` |
| `crud.sql` | `INSERT` / `SELECT` / `UPDATE` / `DELETE` on all 6 tables, statements that break each constraint on purpose, `SET NULL` / `RESTRICT` / `CASCADE`, `COMMIT` and `ROLLBACK`. It deletes what it adds, so the data is the same afterwards. | `npm run sql database/crud.sql` | `seed.sql` |

How the app uses them:

- `npm start` loads `schema.sql` + `seed.sql` by itself the first time. It also reloads them whenever you edit either file: it stores a fingerprint of both files next to the MySQL data, and a changed fingerprint means "reload".
- `npm run db:reset` is literally `schema.sql` followed by `seed.sql`. You can see this in `package.json`.
- The backend (`backend/src/routes/*.routes.js`) runs the same kinds of statements as `queries.sql` and `crud.sql`, with `?` placeholders (prepared statements) for user input. Section 7.2 maps each one.
- You can also use any other MySQL client: **host `127.0.0.1`, port `3307`, user `root`, no password, database `hostelview`** (for example MySQL Workbench), while the app is running.

## 6. Database design in short

**Tables:** `colleges`, `users`, `hostels`, `rooms`, `photos`, `reviews`. Sample data: 4 colleges, 43 users, 31 hostels (25 approved, 4 pending, 2 rejected), 60 rooms, 99 photos and 100 reviews.

**Relationships (all one-to-many):**

| Parent → child | Meaning | ON DELETE |
|---|---|---|
| colleges → users | a verified student's college | SET NULL |
| colleges → hostels | the college a hostel belongs to | RESTRICT |
| users → hostels (`submitted_by`) | who listed the hostel | RESTRICT |
| hostels → rooms | room types of a hostel | CASCADE |
| hostels → photos, hostels → reviews | content about a hostel | CASCADE |
| rooms → photos, rooms → reviews | optional: about one room | SET NULL |
| users → photos, users → reviews | who uploaded / wrote it | CASCADE |

All foreign keys use `ON UPDATE CASCADE`.

**Constraints:**

- Every table has an `AUTO_INCREMENT` primary key.
- `UNIQUE` on `users.email`.
- `NOT NULL` on required columns.
- `ENUM` for role, hostel type and status.
- `DEFAULT` values: status `'pending'`, `is_verified` `FALSE`, `created_at` = now.
- 5 `CHECK` constraints: rating 1–5, capacity > 0, price ≥ 0, free beds ≥ 0, avg_rating 0–5.
- `hostels.amenities` is a `JSON` column, so MySQL rejects invalid JSON.

**Design decisions you may be asked about:**

- **Moderation:** new hostels, photos and reviews start as `pending`. Only `approved` rows are public.
- **`avg_rating`:** a stored (derived) value, so sorting by rating is fast. It's recalculated inside the same transaction that approves or deletes a review, so it can't drift.
- **`amenities` as JSON:** the list varies per hostel (Wi-Fi, gym, veg mess…). Filters use `JSON_CONTAINS`.
- **`hostel_id` on photos and reviews:** they keep it even when `room_id` is set, because `room_id` is optional (a photo or review can be about the whole hostel). The API checks that the room belongs to that hostel.
- **Fees:** stored as `price_per_month`. The app shows `× 12` as the yearly fee.
- **Indexes:** they match the common filters (`(college_id, status)`, `(hostel_id, status)`, `avg_rating` …). `EXPLAIN` in Q22 shows one being used.

---

## 7. Demo guide for the database professor

Keep two terminals open: `npm start` in one and `npm run sql` in the other. Refresh the browser after a SQL change.

### 7.1 Show the schema

```sql
SHOW TABLES;
DESCRIBE hostels;
SHOW CREATE TABLE reviews\G
SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'hostelview'
ORDER BY table_name, constraint_type;
```

Then show the ER diagram: paste `database/hostelview.dbml` into dbdiagram.io.

### 7.2 Every CRUD operation on every table: app action ↔ SQL

"crud.sql §" is the section of `database/crud.sql` that runs the same operation directly in SQL.

**colleges** (crud.sql §1)

| | In the app | SQL the backend runs |
|---|---|---|
| Create | Admin → Admin dashboard → Colleges → *Add college* | `INSERT INTO colleges (name, city, state, website) VALUES (?, ?, ?, ?)` |
| Read | *Colleges* page (cards + comparison table), college list on *Sign up* | `SELECT … FROM colleges c LEFT JOIN (per-college counts and fee ranges) …` (Q9–Q11) |
| Update | Admin → Colleges → *Edit* | `UPDATE colleges SET name = ?, city = ?, state = ?, website = ? WHERE college_id = ?` |
| Delete | Admin → Colleges → *Delete*. Refused while the college has hostels (RESTRICT). | `DELETE FROM colleges WHERE college_id = ?` (its students' `college_id` becomes NULL) |

**users** (crud.sql §2 and §8)

| | In the app | SQL the backend runs |
|---|---|---|
| Create | *Sign up* (visitor or student) | `INSERT INTO users (name, email, password_hash, role, college_email, is_verified, college_id) VALUES (…)` (password stored as a bcrypt hash) |
| Read | *Log in*; *Account* page; Admin → Users & roles | `SELECT user_id, password_hash FROM users WHERE email = ?` · `SELECT u.*, c.name FROM users u LEFT JOIN colleges c …` |
| Update | Enter the OTP on *Verify*; *Account* → change name / password; Admin → Users → change role or verification | `UPDATE users SET role = 'student', is_verified = TRUE, college_id = ?, college_email = ? WHERE user_id = ?` |
| Delete | Admin → Users → *Delete* | Transaction: `UPDATE hostels SET submitted_by = <admin> WHERE submitted_by = ?` → `DELETE FROM users WHERE user_id = ?` (their photos and reviews CASCADE) → recalculate ratings |

**hostels** (crud.sql §3, §8, §9)

| | In the app | SQL the backend runs |
|---|---|---|
| Create | Verified student → *Add a hostel* (`/hostels/new`), optionally with rooms | Transaction: `INSERT INTO hostels (…)` + one `INSERT INTO rooms (…)` per room. Status `pending` (admins: `approved`). |
| Read | *Explore* (search + filters), hostel page, *Compare*, home page | `SELECT … FROM hostels h JOIN colleges c … WHERE h.status = 'approved' AND EXISTS (SELECT 1 FROM rooms r WHERE …)` (Q6, Q17) |
| Update | *Edit* (owner while pending/rejected, admin any time); Admin → Moderation → *Approve* / *Reject* | `UPDATE hostels SET name = ?, type = ?, address = ?, amenities = ?, updated_at = NOW() WHERE hostel_id = ?` · `UPDATE hostels SET status = ? WHERE hostel_id IN (?)` |
| Delete | Hostel page → *Delete* (admin, or owner before approval) | `DELETE FROM hostels WHERE hostel_id = ?` (rooms, photos and reviews CASCADE) |

**rooms** (crud.sql §4, §8)

| | In the app | SQL the backend runs |
|---|---|---|
| Create | Hostel page → *Add room* (AC / non-AC, sharing, yearly fee, free beds) | `INSERT INTO rooms (hostel_id, room_type, capacity, is_ac, floor_no, price_per_month, availability) VALUES (…)` |
| Read | Rooms table on the hostel page, *Compare* page | `SELECT r.*, COUNT(p.photo_id) FROM rooms r LEFT JOIN photos p … GROUP BY r.room_id` |
| Update | Hostel page → *Edit room* | `UPDATE rooms SET room_type = ?, capacity = ?, is_ac = ?, floor_no = ?, price_per_month = ?, availability = ? WHERE room_id = ?` |
| Delete | Hostel page → *Delete room* | `DELETE FROM rooms WHERE room_id = ?` (its photos and reviews stay, `room_id` becomes NULL) |

**photos** (crud.sql §5, §8)

| | In the app | SQL the backend runs |
|---|---|---|
| Create | Hostel page → *Upload photos* (file saved in `backend/uploads/photos`) | `INSERT INTO photos (hostel_id, room_id, url, caption, uploaded_by, status) VALUES (…)` |
| Read | Photo gallery on the hostel page; *Account* → my submissions | `SELECT p.*, u.name FROM photos p JOIN users u … WHERE p.hostel_id = ? AND p.status = 'approved'` |
| Update | Admin → Moderation → Photos → *Approve* / *Reject* (one or many) | `UPDATE photos SET status = ? WHERE photo_id IN (?)` |
| Delete | *Account* (own photo) or Admin → Moderation | `DELETE FROM photos WHERE photo_id = ?` (the file is deleted too) |

**reviews** (crud.sql §6, §8)

| | In the app | SQL the backend runs |
|---|---|---|
| Create | Hostel page → *Write a review* (verified student of that college) | `INSERT INTO reviews (hostel_id, room_id, user_id, rating, title, comment, status) VALUES (…, 'pending')` |
| Read | Reviews and rating bars on the hostel page | `SELECT … FROM reviews rv JOIN users u … LEFT JOIN rooms r … WHERE rv.hostel_id = ? AND rv.status = 'approved'` · `SELECT rating, COUNT(*) … GROUP BY rating` |
| Update | Admin → Moderation → Reviews → *Approve* / *Reject* | Transaction: `UPDATE reviews SET status = ? …` + `UPDATE hostels SET avg_rating = (SELECT ROUND(AVG(rating), 1) …)` → `COMMIT` |
| Delete | Hostel page → *Delete review* (author or admin) | Transaction: `DELETE FROM reviews WHERE review_id = ?` + recalculate `avg_rating` |

### 7.3 Live demo: do it in the app, prove it in SQL

| # | In the browser | Then in `npm run sql` | What it shows |
|---|---|---|---|
| 1 | *Sign up* as a student of Jadavpur University with any `…@jaduniv.edu.in` email | `SELECT user_id, name, role, is_verified FROM users ORDER BY user_id DESC LIMIT 1;` | INSERT, `is_verified = 0` (DEFAULT) |
| 2 | On *Verify*, click **Use code** in the simulated inbox | the same query | UPDATE: `role = student`, `is_verified = 1` |
| 3 | *Add a hostel* with one room | `SELECT hostel_id, name, status FROM hostels ORDER BY hostel_id DESC LIMIT 1;` | INSERT in a transaction, status `pending` |
| 4 | Log in as admin → Moderation → approve it | the same query, then open *Explore* | UPDATE of status; only approved rows are public |
| 5 | As the student, *Write a review* (4★); approve it as admin | `SELECT avg_rating FROM hostels WHERE hostel_id = <id>;` | transaction: status + avg_rating together |
| 6 | Hostel page → *Delete room* | `SELECT review_id, room_id FROM reviews WHERE hostel_id = <id>;` | ON DELETE SET NULL |
| 7 | Hostel page → *Delete* (admin) | `SELECT COUNT(*) FROM reviews WHERE hostel_id = <id>;` → 0 | ON DELETE CASCADE |
| 8 | Admin → Colleges → delete *VIT Vellore* | – | refused: RESTRICT (it still has hostels) |

### 7.4 The other way round: change it in SQL, see it in the app

```sql
UPDATE hostels SET name = 'Men''s Hostel – H Block (renamed)' WHERE hostel_id = 1;   -- refresh /hostels/1
UPDATE rooms SET availability = 0 WHERE hostel_id = 1;                                -- the rooms show as full
UPDATE hostels SET status = 'approved' WHERE hostel_id = 7;                          -- R Block appears in Explore
UPDATE users SET role = 'admin' WHERE email = 'priya.demo@vitstudent.ac.in';         -- Priya gets the Admin menu
```

Run `npm run db:reset` afterwards to undo everything.

### 7.5 Constraints (crud.sql §7 and §8; each statement fails on purpose)

| Constraint | Statement | MySQL says |
|---|---|---|
| PRIMARY KEY | `INSERT INTO colleges (college_id, …) VALUES (1, …)` | `ERROR 1062: Duplicate entry '1' for key 'colleges.PRIMARY'` |
| UNIQUE | a second user with `admin@hostelview.io` | `ERROR 1062: Duplicate entry … for key 'users.idx_users_email'` |
| NOT NULL | hostel with `name = NULL` | `ERROR 1048: Column 'name' cannot be null` |
| ENUM | hostel `type = 'mixed'` | `ERROR 1265: Data truncated for column 'type'` |
| CHECK | review `rating = 6`; room `capacity = 0` | `ERROR 3819: Check constraint 'chk_reviews_rating' is violated` |
| FOREIGN KEY (insert) | hostel for `college_id = 99` | `ERROR 1452: Cannot add or update a child row …` |
| FOREIGN KEY RESTRICT (delete) | `DELETE FROM colleges WHERE college_id = 1` | `ERROR 1451: Cannot delete or update a parent row …` |
| JSON | `amenities = 'wifi, gym'` | `ERROR 3140: Invalid JSON text` |

The app turns these errors into friendly messages (`backend/src/utils/errors.js`) and also checks most rules before running SQL.

### 7.6 What the foreign keys do

| Action | Example | Demo |
|---|---|---|
| ON DELETE CASCADE | Deleting a hostel deletes its rooms, photos and reviews | crud.sql §9 deletes hostel 1 inside a transaction: 3 rooms, 4 photos and 6 reviews disappear, then `ROLLBACK` brings them back |
| ON DELETE SET NULL | Deleting a room keeps its photos and reviews, but `room_id` becomes NULL | crud.sql §8 |
| ON DELETE RESTRICT | A college with hostels, or a user who listed a hostel, can't be deleted | crud.sql §7, §8 |
| ON UPDATE CASCADE | Changing `colleges.college_id` changes it in `hostels` and `users` too | crud.sql §10 (rolled back) |

### 7.7 Transactions

The app uses `START TRANSACTION … COMMIT` (and `ROLLBACK` on any error) in five places:

1. Adding a hostel together with its rooms.
2. Every moderation approve/reject (for reviews it also recalculates `avg_rating`).
3. Deleting a review.
4. Deleting a user.
5. Deleting a college.

You can see it in `withTransaction` in `backend/src/db.js` and `setStatus` in `routes/admin.routes.js`. Try it by hand:

```sql
START TRANSACTION;
DELETE FROM reviews WHERE hostel_id = 1;
SELECT COUNT(*) FROM reviews WHERE hostel_id = 1;   -- 0, but only inside this transaction
ROLLBACK;
SELECT COUNT(*) FROM reviews WHERE hostel_id = 1;   -- back to 6
```

### 7.8 queries.sql: one query per concept

| Q | Concept | Shows |
|---|---|---|
| 1–3 | `SELECT *`, `WHERE` + `ORDER BY`, `LIKE` | colleges; girls' hostels by rating; the search box |
| 4–5 | calculated column + `BETWEEN`, `DISTINCT` | rooms costing ₹1–1.5 lakh a year; sharing options at VIT |
| 6–8 | `INNER JOIN`, 3-table join, `LEFT JOIN … IS NULL` | hostels + college; reviews + author; users with no reviews |
| 9–12 | `GROUP BY` with `COUNT`, `MIN/MAX/AVG`, `SUM` of a condition, `HAVING` | hostels per college; fee range per college; AC vs non-AC; hostels with ≥ 5 reviews |
| 13–17 | subqueries: `IN`, `NOT EXISTS`, scalar, correlated, `EXISTS` | hostels with / without AC rooms; above-average rating; cheapest fee per hostel; the Explore filter |
| 18–19 | JSON, dates | gym + Wi-Fi; reviews from the last 30 days |
| 20 | `UNION ALL` | the admin moderation queue |
| 21 | `CREATE VIEW` / `DROP VIEW` | a saved per-college summary |
| 22 | `EXPLAIN` | MySQL using the index `idx_hostels_college_status` |

### 7.9 Likely viva questions

| Question | Short answer |
|---|---|
| Why MySQL and not MongoDB? | The data is relational: hostels belong to colleges, rooms to hostels, reviews to users. Foreign keys, constraints and transactions keep it consistent. |
| How do you stop fake reviews? | Only verified students (college email + OTP) can review, only hostels of their own college, one review per hostel (or room), and every review is moderated. |
| Why store `avg_rating` if it can be calculated? | Fast sorting and filtering. It's recalculated in the same transaction as the review change, so it's always correct. |
| What happens when a hostel is deleted? | `ON DELETE CASCADE` removes its rooms, photos and reviews. |
| How are passwords stored? | bcrypt hashes (`password_hash`), never plain text. |
| Is the schema normalized? | Yes, to 3NF in practice. The deliberate exceptions are the derived `avg_rating`, and `state` stored next to `city` in `colleges` (a separate cities table isn't worth it for 4 colleges). |
| How is SQL injection prevented? | Every query uses `?` placeholders. Values are never pasted into the SQL text. |

---

## 8. Demo guide for the app (the 7 modules from the report)

| Module | Show this | Log in as |
|---|---|---|
| 1. Users & login | *Sign up* as a student → OTP on *Verify* → *Account* | new account |
| 2. Colleges & hostels | *Colleges* page and comparison table; *Add a hostel* | anyone / verified student |
| 3. Rooms | Hostel page → *Add room* / *Edit room* (AC, sharing, yearly fee, free beds) | `priya.demo@…` |
| 4. Photos | Hostel page → *Upload photos*, then approve them as admin | `priya.demo@…`, admin |
| 5. Reviews & ratings | *Write a review*, approve it, watch the rating change | student, admin |
| 6. Search, filter, compare | *Explore*: AC / non-AC, sharing, yearly budget, veg / non-veg mess, amenities; add 2–4 hostels to *Compare* | anyone |
| 7. Admin | *Admin dashboard*: overview, moderation queue (bulk approve), hostels, users & roles, colleges | `admin@hostelview.io` |

Also show the role rules:

- The **visitor** (`sneha.patel@example.com`) can browse but can't add anything.
- The **unverified student** (`vikram.demo@srmist.edu.in`) is asked to verify first.
- A student **can't add content to another college's hostels**.

Screenshots: [home](docs/screenshots/1-home.jpg) · [explore + filters](docs/screenshots/2-explore.jpg) · [hostel page](docs/screenshots/3-hostel.jpg) · [compare hostels](docs/screenshots/4-compare-hostels.jpg) · [compare colleges](docs/screenshots/5-compare-colleges.jpg) · [OTP verification](docs/screenshots/6-verify-otp.jpg) · [Dev Mailbox](docs/screenshots/7-dev-mailbox.jpg) · [admin moderation](docs/screenshots/8-admin-moderation.jpg)

## 9. How the fake email OTP works

No email is really sent. When a student signs up (or clicks *Resend*), the backend:

1. creates a 6-digit code (stored as a SHA-256 hash, valid for 10 minutes, 5 attempts, 30-second resend wait);
2. "sends" an email that appears in three places:
   - the **Simulated inbox** box on the *Verify* page, where **Use code** fills it in;
   - the **Dev Mailbox** page (`/dev/mailbox`);
   - the terminal running `npm start`.

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| I see old or unknown colleges | Run `npm start`: it notices that `seed.sql` changed and reloads the database. You can also run `npm run db:reset`. |
| Port 5000 is busy | Close the other program, or start with another port. PowerShell: `$env:PORT=5050; npm start`, cmd: `set PORT=5050 && npm start`, macOS/Linux: `PORT=5050 npm start`. Port 3307 moves to the next free port automatically. |
| Windows: "MySQL stopped while starting" | Install the Microsoft Visual C++ Redistributable (https://aka.ms/vs/17/release/vc_redist.x64.exe) and run `npm start` again. |
| Linux: missing `libaio` / `libnuma` | `sudo apt install libaio1t64 libnuma1` (Debian/Ubuntu) |
| "Another MySQL process is still using the data folder" | End `mysqld` in Task Manager (Windows) or run `pkill mysqld`, then start again. |
| Remove everything | Delete the project folder and the MySQL folder: `%LOCALAPPDATA%\HostelView` (Windows), `~/Library/Application Support/HostelView` (macOS), `~/.local/share/hostelview` (Linux). |

## 11. Credits

- **Real data:** college and hostel names are real.
- **Fees:** approximate yearly room + mess charges, based on published 2025-26 fee notices.
- **Users and reviews:** written for this demo.
- **Photos:** the real photos come from Wikimedia Commons. Author and licence are in each caption and in `backend/uploads/seed/CREDITS.md`. The other photos are AI illustrations.
