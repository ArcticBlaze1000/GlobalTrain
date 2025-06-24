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
    { name: 'courses', schema: `CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT, doc_ids TEXT)` },
    { name: 'documents', schema: `CREATE TABLE documents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)` },
    { name: 'questionnaires', schema: `CREATE TABLE questionnaires (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, section TEXT, question_text TEXT NOT NULL, input_type TEXT NOT NULL, field_name TEXT NOT NULL, access TEXT, FOREIGN KEY (document_id) REFERENCES documents(id))` },
    { name: 'responses', schema: `CREATE TABLE responses (id INTEGER PRIMARY KEY AUTOINCREMENT, datapack_id INTEGER NOT NULL, document_id INTEGER NOT NULL, field_name TEXT NOT NULL, response_data TEXT, completed BOOLEAN DEFAULT 0, FOREIGN KEY (datapack_id) REFERENCES datapack(id), FOREIGN KEY (document_id) REFERENCES documents(id))` },
    { name: 'competencies', schema: `CREATE TABLE competencies (id INTEGER PRIMARY KEY, name TEXT, course_id INTEGER)` },
    { name: 'datapack', schema: `CREATE TABLE datapack (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, trainer_id INTEGER, start_date TEXT, duration INTEGER, total_trainee_count INTEGER, trainee_ids TEXT)` },
    // Old tables to ensure they are dropped
    { name: 'trainers' }, { name: 'admins' }, { name: 'devs' }
];

// --- Seed Data ---
const usersToSeed = [
    { forename: 'Aditya', surname: 'Chaubey', role: 'dev', username: 'aditya', password: 'chaubey' },
    { forename: 'Mick', surname: 'Lamont', role: 'admin', username: 'mick', password: 'lamont' },
    { forename: 'George', surname: 'Penman', role: 'trainer', username: 'george', password: 'penman' },
    { forename: 'Stewart', surname: 'Roxburgh', role: 'trainer', username: 'stewart', password: 'roxburgh' },
];
const coursesToSeed = [
    { name: 'PTS', doc_ids: '1,2,3' }, 
    { name: 'PTS Reset', doc_ids: '1,2' }, 
    { name: 'COSS Initial', doc_ids: '1,2' }
];
const documentsToSeed = [
    { name: 'Register' },
    { name: 'TrainingCourseChecklist' },
    { name: 'TrainingAndWeldingTrackSafetyBreifing' }
];
const questionnairesToSeed = [
    // Register Questions (document_id = 1)
    { document_id: 1, section: null, question_text: 'Trainer Full Name', input_type: 'text', field_name: 'trainer_name', access: 'trainer' },
    { document_id: 1, section: null, question_text: 'Did all trainees attend?', input_type: 'checkbox', field_name: 'all_attended', access: 'trainer' },
    { document_id: 1, section: null, question_text: 'Was equipment checked?', input_type: 'checkbox', field_name: 'equipment_check', access: 'trainer' },
    { document_id: 1, section: null, question_text: 'Add final session notes', input_type: 'text', field_name: 'session_notes', access: 'trainer' },

    // TrainingCourseChecklist Questions (document_id = 2)
    // -- PRE COURSE CHECKS --
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Global Train Capability (Sentinel)', input_type: 'checkbox', field_name: 'gtc_sentinel', access: 'admin' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Trainer Capability (Sentinel)', input_type: 'checkbox', field_name: 'tc_sentinel', access: 'admin' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Course Attendance Form (Ensure NWR Toolkit Red are completed)', input_type: 'checkbox', field_name: 'caf_nwr', access: 'trainer' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Progress Record', input_type: 'checkbox', field_name: 'progress_record', access: 'trainer' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'For Trainers Sub Sponsored: Sub Sponsorship Paperwork and Approval', input_type: 'checkbox', field_name: 'sponsorship_approval', access: 'trainer' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Booking Form', input_type: 'checkbox', field_name: 'booking_form', access: 'admin' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Joining Instructions', input_type: 'checkbox', field_name: 'joining_instructions', access: 'admin' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Practical Track Visit Briefing Forms and SWP', input_type: 'checkbox', field_name: 'track_visit_swp', access: 'trainer' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Sentinel Notification Report', input_type: 'checkbox', field_name: 'sentinel_notification', access: 'admin' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Sentinel Sepite in Reports', input_type: 'checkbox', field_name: 'sentinel_reports', access: 'trainer' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Issued/Updated log books', input_type: 'checkbox', field_name: 'log_books', access: 'trainer' },
    // -- LEARNER PACKS --
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Delegate ID Form', input_type: 'checkbox', field_name: 'delegate_id', access: 'trainer' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Candidate Sentinel Printout', input_type: 'checkbox', field_name: 'candidate_sentinel', access: 'trainer' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Log books entries, electronic, paper', input_type: 'checkbox', field_name: 'log_book_entries', access: 'trainer' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Learner Questionnaire and Feedback Form', input_type: 'checkbox', field_name: 'feedback_form', access: 'trainer' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Course Documentation', input_type: 'checkbox', field_name: 'course_docs', access: 'trainer' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Post Course Training / Assessment Cycle (all Sentinel Courses)', input_type: 'checkbox', field_name: 'assessment_cycle', access: 'trainer' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Certificate of Competence (all Sentinel Courses)', input_type: 'checkbox', field_name: 'cert_of_competence', access: 'trainer' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Issued Certificate/s', input_type: 'checkbox', field_name: 'issued_certs', access: 'trainer' }
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
    { course_id: 1, trainer_id: 3, start_date: '2025-08-01', duration: 1, total_trainee_count: 1, trainee_ids: '1' },
    { course_id: 2, trainer_id: 4, start_date: '2025-08-10', duration: 5, total_trainee_count: 3, trainee_ids: '2,3,4' },
    { course_id: 3, trainer_id: 3, start_date: '2025-09-05', duration: 7, total_trainee_count: 2, trainee_ids: '5,6' },
    { course_id: 1, trainer_id: 4, start_date: '2025-09-20', duration: 3, total_trainee_count: 2, trainee_ids: '7,8' },
    { course_id: 3, trainer_id: 3, start_date: '2025-10-01', duration: 4, total_trainee_count: 2, trainee_ids: '9,10' }
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

    const courseStmt = db.prepare(`INSERT INTO courses (name, doc_ids) VALUES (?, ?)`);
    coursesToSeed.forEach(course => courseStmt.run([course.name, course.doc_ids]));
    courseStmt.finalize();

    const docStmt = db.prepare(`INSERT INTO documents (name) VALUES (?)`);
    documentsToSeed.forEach(doc => docStmt.run(doc.name));
    docStmt.finalize();

    const questionnaireStmt = db.prepare(`INSERT INTO questionnaires (document_id, section, question_text, input_type, field_name, access) VALUES (?, ?, ?, ?, ?, ?)`);
    questionnairesToSeed.forEach(q => questionnaireStmt.run(Object.values(q)));
    questionnaireStmt.finalize();

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