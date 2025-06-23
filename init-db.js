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
    // Drop existing tables for a clean seed (optional, good for development)
    db.run(`DROP TABLE IF EXISTS users`);
    db.run(`DROP TABLE IF EXISTS trainers`);
    db.run(`DROP TABLE IF EXISTS courses`);
    db.run(`DROP TABLE IF EXISTS trainees`);
    db.run(`DROP TABLE IF EXISTS competencies`);
    db.run(`DROP TABLE IF EXISTS selections`);

    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS trainers (id INTEGER PRIMARY KEY, name TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY, name TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS trainees (id INTEGER PRIMARY KEY, name TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS competencies (id INTEGER PRIMARY KEY, name TEXT, course_id INTEGER)`);
    db.run(`CREATE TABLE IF NOT EXISTS selections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trainer_id INTEGER,
        course_id INTEGER,
        trainee_id INTEGER,
        competency_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed data
    const trainers = ['John Doe', 'Jane Smith', 'Peter Jones'];
    const courses = ['Introduction to React', 'Advanced Node.js', 'Database Management'];
    const trainees = ['Alice', 'Bob', 'Charlie'];
    const competencies = [
        { name: 'Component Lifecycle', course_id: 1 },
        { name: 'State and Props', course_id: 1 },
        { name: 'Async/Await', course_id: 2 },
        { name: 'SQL Queries', course_id: 3 },
    ];

    trainers.forEach(name => db.run(`INSERT INTO trainers (name) VALUES (?)`, [name]));
    courses.forEach(name => db.run(`INSERT INTO courses (name) VALUES (?)`, [name]));
    trainees.forEach(name => db.run(`INSERT INTO trainees (name) VALUES (?)`, [name]));
    competencies.forEach(c => db.run(`INSERT INTO competencies (name, course_id) VALUES (?, ?)`, [c.name, c.course_id]));
    
    console.log('Database seeded successfully.');
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the database connection.');
}); 