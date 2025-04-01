CREATE TABLE lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL -- 'daily', 'weekly', 'monthly'
);

CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10), -- For weekly lists (optional)
  date_of_month INTEGER -- For monthly lists (optional)
);