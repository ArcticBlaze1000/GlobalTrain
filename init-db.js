const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');
});

// --- Schema Definition ---
const tables = [
    { name: 'users', schema: `CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, forename TEXT, surname TEXT, role TEXT, username TEXT UNIQUE, password TEXT)` },
    { name: 'trainees', schema: `CREATE TABLE trainees (id INTEGER PRIMARY KEY AUTOINCREMENT, forename TEXT NOT NULL, surname TEXT NOT NULL, sponsor TEXT, sentry_number TEXT)` },
    { name: 'courses', schema: `CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT)` },
    { name: 'competencies', schema: `CREATE TABLE competencies (id INTEGER PRIMARY KEY, name TEXT, course_id INTEGER)` },
    { name: 'datapack', schema: `CREATE TABLE datapack (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, trainer_id INTEGER, start_date TEXT, duration INTEGER, total_trainee_count INTEGER, trainee_ids TEXT)` },
    // Old tables to ensure they are dropped
    { name: 'trainers' }, { name: 'admins' }, { name: 'devs' }
];

// --- Seed Data ---
const usersToSeed = [
    { forename: 'Aditya', surname: 'Chaubey', role: 'dev', username: 'aditya', password: 'chaubey' },
    { forename: 'George', surname: 'Penman', role: 'trainer', username: 'george', password: 'penman' },
    { forename: 'Stewart', surname: 'Roxburgh', role: 'trainer', username: 'stewart', password: 'roxburgh' },
];
const coursesToSeed = [{ name: 'PTS' }, { name: 'PTS Reset' }, { name: 'COSS Initial'}    
];
const traineesToSeed = [
    { forename: 'John', surname: 'Doe', sponsor: 'SWGR', sentry_number: '123456' }, 
    { forename: 'Jane', surname: 'Smith', sponsor: 'Network Rail', sentry_number: '654321' },
    { forename: 'Jim', surname: 'Beam', sponsor: 'SWGR', sentry_number: '123456' },
    { forename: 'Jim', surname: 'Brown', sponsor: 'SWGR', sentry_number: '123456' },
    { forename: 'Alice', surname: 'Johnson', sponsor: 'Network Rail', sentry_number: '987654' },
    { forename: 'Bob', surname: 'Williams', sponsor: 'Babcock', sentry_number: '456789' },
    { forename: 'Eve', surname: 'Davis', sponsor: 'SWGR', sentry_number: '321654' },
    { forename: 'Charlie', surname: 'Miller', sponsor: 'Siemens', sentry_number: '789123' },
    { forename: 'Grace', surname: 'Taylor', sponsor: 'Amey', sentry_number: '147258' },
    { forename: 'Liam', surname: 'Anderson', sponsor: 'Colas Rail', sentry_number: '258369' }
];
const datapackToSeed = [
    { course_id: 1, trainer_id: 2, start_date: '2025-08-01', duration: 10, total_trainee_count: 1, trainee_ids: '1' },
    { course_id: 2, trainer_id: 3, start_date: '2025-08-10', duration: 5, total_trainee_count: 3, trainee_ids: '2,3,4' },
    { course_id: 3, trainer_id: 2, start_date: '2025-09-05', duration: 7, total_trainee_count: 2, trainee_ids: '5,6' },
    { course_id: 1, trainer_id: 3, start_date: '2025-09-20', duration: 3, total_trainee_count: 2, trainee_ids: '7,8' },
    { course_id: 3, trainer_id: 2, start_date: '2025-10-01', duration: 4, total_trainee_count: 2, trainee_ids: '9,10' }
];

db.serialize(() => {
    db.run('BEGIN TRANSACTION', (err) => {
        if (err) return console.error('Could not begin transaction:', err.message);
    });

    console.log('Dropping all tables...');
    tables.forEach(table => {
        db.run(`DROP TABLE IF EXISTS ${table.name}`);
    });

    console.log('Creating tables...');
    tables.forEach(table => {
        if (table.schema) db.run(table.schema);
    });

    console.log('Seeding data...');
    const userStmt = db.prepare(`INSERT INTO users (forename, surname, role, username, password) VALUES (?, ?, ?, ?, ?)`);
    usersToSeed.forEach(user => userStmt.run(Object.values(user)));
    userStmt.finalize();

    const courseStmt = db.prepare(`INSERT INTO courses (name) VALUES (?)`);
    coursesToSeed.forEach(course => courseStmt.run(course.name));
    courseStmt.finalize();

    const traineeStmt = db.prepare(`INSERT INTO trainees (forename, surname, sponsor, sentry_number) VALUES (?, ?, ?, ?)`);
    traineesToSeed.forEach(trainee => traineeStmt.run(Object.values(trainee)));
    traineeStmt.finalize();

    const datapackStmt = db.prepare(`INSERT INTO datapack (course_id, trainer_id, start_date, duration, total_trainee_count, trainee_ids) VALUES (?, ?, ?, ?, ?, ?)`);
    datapackToSeed.forEach(dp => datapackStmt.run(Object.values(dp)));
    datapackStmt.finalize();

    db.run('COMMIT', (err) => {
        if (err) {
            console.error('Could not commit transaction:', err.message);
            db.run('ROLLBACK');
        } else {
            console.log('Database initialization complete.');
        }
    });
});

db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    else console.log('Database connection closed.');
}); 