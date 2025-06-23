const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    // Drop all tables being modified to ensure a clean slate
    console.log('Dropping old tables...');
    // Drop role-specific tables that are no longer needed
    db.run(`DROP TABLE IF EXISTS trainers`);
    db.run(`DROP TABLE IF EXISTS admins`);
    db.run(`DROP TABLE IF EXISTS devs`);
    
    // Drop and recreate trainees and users to ensure schema is up-to-date
    db.run(`DROP TABLE IF EXISTS trainees`);
    db.run(`DROP TABLE IF EXISTS users`);
    db.run(`DROP TABLE IF EXISTS courses`);
    db.run(`DROP TABLE IF EXISTS competencies`);
    db.run(`DROP TABLE IF EXISTS datapack`);

    // Recreate tables with the new schema
    console.log('Recreating tables with new schema...');
    db.run(`CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT)`);
    db.run(`CREATE TABLE competencies (id INTEGER PRIMARY KEY, name TEXT, course_id INTEGER)`);

    db.run(`CREATE TABLE trainees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forename TEXT NOT NULL,
        surname TEXT NOT NULL,
        sponsor TEXT,
        sentry_number TEXT
    )`);

    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forename TEXT,
        surname TEXT,
        role TEXT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE datapack (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        trainer_id INTEGER,
        start_date TEXT,
        duration INTEGER,
        total_trainee_count INTEGER,
        trainee_ids TEXT
    )`);

    // Seed data
    console.log('Seeding initial user data...');
    db.run(`INSERT INTO courses (name) VALUES ('PTS')`);
    const userSql = `INSERT INTO users (forename, surname, role, username, password) VALUES (?, ?, ?, ?, ?)`;
    // Dev user
    db.run(userSql, ['Aditya', 'Chaubey', 'dev', 'aditya', 'chaubey']);
    // Trainer user
    db.run(userSql, ['George', 'Penman', 'trainer', 'george', 'penman']);
    
    console.log('Database schema and data updated successfully.');
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the database connection.');
}); 