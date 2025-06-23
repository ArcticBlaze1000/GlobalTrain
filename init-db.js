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
    db.run(`DROP TABLE IF EXISTS trainers`);
    db.run(`DROP TABLE IF EXISTS trainees`);
    db.run(`DROP TABLE IF EXISTS users`);
    db.run(`DROP TABLE IF EXISTS admins`);
    db.run(`DROP TABLE IF EXISTS devs`);
    
    // Keep other tables like courses, competencies, datapack as they were not mentioned.

    // Recreate tables with the new schema
    console.log('Recreating tables with new schema...');
    db.run(`CREATE TABLE trainers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forename TEXT,
        surname TEXT
    )`);

    db.run(`CREATE TABLE trainees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forename TEXT,
        surname TEXT,
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

    db.run(`CREATE TABLE admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forename TEXT,
        surname TEXT
    )`);

    db.run(`CREATE TABLE devs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forename TEXT,
        surname TEXT
    )`);

    // Seed data
    console.log('Seeding initial user data...');
    const devSql = `INSERT INTO devs (forename, surname) VALUES (?, ?)`;
    db.run(devSql, ['Aditya', 'Chaubey']);

    const userSql = `INSERT INTO users (forename, surname, role, username, password) VALUES (?, ?, ?, ?, ?)`;
    db.run(userSql, ['Aditya', 'Chaubey', 'dev', 'Aditya', 'Aditya']);
    
    console.log('Database schema and data updated successfully.');
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the database connection.');
}); 