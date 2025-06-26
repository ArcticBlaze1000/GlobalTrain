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
    { name: 'trainees', schema: `CREATE TABLE trainees (id INTEGER PRIMARY KEY AUTOINCREMENT, forename TEXT NOT NULL, surname TEXT NOT NULL, sponsor TEXT, sentry_number TEXT, additional_comments TEXT)` },
    { name: 'courses', schema: `CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT, doc_ids TEXT, competency_ids TEXT)` },
    { name: 'documents', schema: `CREATE TABLE documents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, scope TEXT)` },
    { name: 'questionnaires', schema: `CREATE TABLE questionnaires (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, section TEXT, question_text TEXT NOT NULL, input_type TEXT NOT NULL, field_name TEXT NOT NULL, access TEXT, has_comments TEXT DEFAULT 'NO', FOREIGN KEY (document_id) REFERENCES documents(id))` },
    { name: 'questionnaire_options', schema: `CREATE TABLE questionnaire_options (id INTEGER PRIMARY KEY AUTOINCREMENT, question_field_name TEXT NOT NULL, option_value TEXT NOT NULL)` },
    { name: 'responses', schema: `CREATE TABLE responses (id INTEGER PRIMARY KEY AUTOINCREMENT, datapack_id INTEGER NOT NULL, document_id INTEGER NOT NULL, trainee_ids TEXT, field_name TEXT NOT NULL, response_data TEXT, completed BOOLEAN DEFAULT 0, additional_comments TEXT, FOREIGN KEY (datapack_id) REFERENCES datapack(id), FOREIGN KEY (document_id) REFERENCES documents(id), UNIQUE(datapack_id, document_id, field_name))` },
    { name: 'competencies', schema: `CREATE TABLE competencies (id INTEGER PRIMARY KEY, name TEXT)` },
    { name: 'datapack', schema: `CREATE TABLE datapack (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, trainer_id INTEGER, start_date TEXT, duration INTEGER, total_trainee_count INTEGER, trainee_ids TEXT)` },
    { name: 'attendance_timers', schema: `CREATE TABLE attendance_timers (id INTEGER PRIMARY KEY AUTOINCREMENT, datapack_id INTEGER NOT NULL, day_number INTEGER NOT NULL, timer_start_time TEXT NOT NULL, UNIQUE(datapack_id, day_number))`},
    // Old tables to ensure they are dropped
    { name: 'trainers' }, { name: 'admins' }, { name: 'devs' }
];

// --- Seed Data ---
const usersToSeed = [
    { forename: 'Aditya', surname: 'Chaubey', role: 'dev', username: 'aditya', password: 'chaubey' },
    { forename: 'Mick', surname: 'Lamont', role: 'admin', username: 'mick', password: 'lamont' },
    { forename: 'George', surname: 'Penman', role: 'trainer', username: 'george', password: 'penman' },
    { forename: 'Stewart', surname: 'Roxburgh', role: 'trainer', username: 'stewart', password: 'roxburgh' },
    { forename: 'Brenda', surname: 'Moore', role: 'admin', username: 'brenda', password: 'moore' },
];
const competenciesToSeed = [
    { name: 'PTS' },
    { name: 'DCCR' },
    { name: 'COSS' },
    { name: 'OLP' },
    { name: 'PC' },
];
const coursesToSeed = [
    { name: 'PTS', doc_ids: '1,2,3,4,5,6' }, 
    { name: 'PTS Reset', doc_ids: '1,2' }, 
    { name: 'COSS Initial', doc_ids: '1,2' }
];
const documentsToSeed = [
    { name: 'Register', scope: 'course' },
    { name: 'TrainingCourseChecklist', scope: 'course' },
    { name: 'TrainingAndWeldingTrackSafetyBreifing', scope: 'course' },
    { name: 'Pre Course', scope: 'candidate' },
    { name: 'Post Course', scope: 'candidate' },
    { name: 'Leaving Form', scope: 'candidate' }
];
const questionnairesToSeed = [
    // Register Questions (document_id = 1)
    { document_id: 1, section: 'HEADER', question_text: 'NWR Toolkit No', input_type: 'number', field_name: 'nwr_toolkit_no', access: 'trainer' },
    { document_id: 1, section: 'HEADER', question_text: 'Resources Fit For Purpose', input_type: 'checkbox', field_name: 'resources_fit_for_purpose', access: 'trainer' },  
    { document_id: 1, section: 'HEADER', question_text: 'Resources', input_type: 'dropdown', field_name: 'resources', access: 'trainer' },
    
    // Dynamically generate from day 1 to 14 days of attendance questions
    ...Array.from({ length: 14 }, (_, i) => ({
        document_id: 1,
        section: 'MAIN',
        question_text: `Day ${i + 1}`,
        input_type: 'signature_grid',
        field_name: `day_${i + 1}_attendance`,
        access: 'trainer',
        has_comments: 'NO'
    })),
    { document_id: 1, section: 'HEADER', question_text: 'Level of spoken English adequate', input_type: 'trainee_dropdown_grid', field_name: 'level_of_spoken_english_adequate', access: 'trainer', has_comments: 'NO' },
    { document_id: 1, section: 'MAIN', question_text: 'Final Result', input_type: 'trainee_dropdown_grid', field_name: 'final_result', access: 'trainer', has_comments: 'NO' },
    { document_id: 1, section: 'MAIN', question_text: 'Sentinel Notified Date', input_type: 'trainee_date_grid', field_name: 'sentinel_notified_date', access: 'admin', has_comments: 'NO' },

    // New comment and signature sections for the Register
    { document_id: 1, section: 'FOOTER', question_text: 'Trainer Comments', input_type: 'textarea', field_name: 'trainer_comments', access: 'trainer' },
    { document_id: 1, section: 'FOOTER', question_text: 'Trainer Signature', input_type: 'signature_box', field_name: 'trainer_signature', access: 'trainer' },
    { document_id: 1, section: 'FOOTER', question_text: 'Admin Comments', input_type: 'textarea', field_name: 'admin_comments', access: 'admin' },
    { document_id: 1, section: 'FOOTER', question_text: 'Admin Signature', input_type: 'signature_box', field_name: 'admin_signature', access: 'admin' },

    // TrainingCourseChecklist Questions (document_id = 2)
    // -- PRE COURSE CHECKS --
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Global Train Capability (Sentinel)', input_type: 'tri_toggle', field_name: 'gtc_sentinel', access: 'admin', has_comments: 'YES'  },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Trainer Capability (Sentinel)', input_type: 'tri_toggle', field_name: 'tc_sentinel', access: 'admin', has_comments: 'YES'  },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Course Attendance Form (Ensure NWR Toolkit Red are completed)', input_type: 'tri_toggle', field_name: 'caf_nwr', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Progress Record', input_type: 'tri_toggle', field_name: 'progress_record', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'For Trainers Sub Sponsored: Sub Sponsorship Paperwork and Approval', input_type: 'tri_toggle', field_name: 'sponsorship_approval', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Booking Form', input_type: 'tri_toggle', field_name: 'booking_form', access: 'admin', has_comments: 'YES' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Joining Instructions', input_type: 'tri_toggle', field_name: 'joining_instructions', access: 'admin', has_comments: 'YES'  },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Practical Track Visit Briefing Forms and SWP', input_type: 'tri_toggle', field_name: 'track_visit_swp', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Sentinel Notification Report', input_type: 'tri_toggle', field_name: 'sentinel_notification', access: 'admin', has_comments: 'YES' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Sentinel Sepite in Reports', input_type: 'tri_toggle', field_name: 'sentinel_reports', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Issued/Updated log books', input_type: 'tri_toggle', field_name: 'log_books', access: 'trainer', has_comments: 'YES' },
    // -- LEARNER PACKS --
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Delegate ID Form', input_type: 'tri_toggle', field_name: 'delegate_id', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Candidate Sentinel Printout', input_type: 'tri_toggle', field_name: 'candidate_sentinel', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Log books entries, electronic, paper', input_type: 'tri_toggle', field_name: 'log_book_entries', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Learner Questionnaire and Feedback Form', input_type: 'tri_toggle', field_name: 'feedback_form', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Course Documentation', input_type: 'tri_toggle', field_name: 'course_docs', access: 'trainer', has_comments: 'YES'  },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Post Course Training / Assessment Cycle (all Sentinel Courses)', input_type: 'tri_toggle', field_name: 'assessment_cycle', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Certificate of Competence (all Sentinel Courses)', input_type: 'tri_toggle', field_name: 'cert_of_competence', access: 'trainer', has_comments: 'YES' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Issued Certificate/s', input_type: 'tri_toggle', field_name: 'issued_certs', access: 'trainer', has_comments: 'YES' }
];

const checklistQuestionFieldNames = questionnairesToSeed
    .filter(q => q.document_id === 2)
    .map(q => q.field_name);

const questionnaireOptionsToSeed = [
    { question_field_name: 'resources', option_value: 'KP' },
    { question_field_name: 'resources', option_value: 'LB' },
    { question_field_name: 'resources', option_value: 'PCO' },
    { question_field_name: 'resources', option_value: 'SR' },
    { question_field_name: 'resources', option_value: 'SHB' },
    { question_field_name: 'level_of_spoken_english_adequate', option_value: 'Yes' },
    { question_field_name: 'level_of_spoken_english_adequate', option_value: 'No' },
    { question_field_name: 'level_of_spoken_english_adequate', option_value: 'Not Applicable' },
    { question_field_name: 'final_result', option_value: 'Competent' },
    { question_field_name: 'final_result', option_value: 'Not Competent' },
];

// Add competency questions dynamically
competenciesToSeed.forEach(comp => {
    const field_name = `competency_${comp.name.toLowerCase().replace(/\s/g, '_')}`;
    questionnairesToSeed.push({
        document_id: 1, // Register
        section: 'COMPETENCIES',
        question_text: comp.name,
        input_type: 'trainee_yes_no_grid',
        field_name: field_name,
        access: 'trainer',
        has_comments: 'NO'
    });
    questionnaireOptionsToSeed.push(
        { question_field_name: field_name, option_value: 'Competent' },
        { question_field_name: field_name, option_value: 'Not Competent' },
        { question_field_name: field_name, option_value: 'Not Applicable' }
    );
});

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
    // Drop and create tables
    console.log('Dropping all tables...');
    tables.forEach(table => {
        db.run(`DROP TABLE IF EXISTS ${table.name}`);
    });

    console.log('Creating tables...');
    tables.forEach(table => {
        if (table.schema) db.run(table.schema);
    });

    // Seed data
    console.log('Seeding data...');
    const userStmt = db.prepare(`INSERT INTO users (forename, surname, role, username, password) VALUES (?, ?, ?, ?, ?)`);
    usersToSeed.forEach(user => userStmt.run(Object.values(user)));
    userStmt.finalize();

    const docStmt = db.prepare(`INSERT INTO documents (name, scope) VALUES (?, ?)`);
    documentsToSeed.forEach(doc => docStmt.run(doc.name, doc.scope));
    docStmt.finalize();

    const questionnaireStmt = db.prepare(`INSERT INTO questionnaires (document_id, section, question_text, input_type, field_name, access, has_comments) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    questionnairesToSeed.forEach(q => questionnaireStmt.run([q.document_id, q.section, q.question_text, q.input_type, q.field_name, q.access, q.has_comments || 'NO']));
    questionnaireStmt.finalize();

    const questionnaireOptionsStmt = db.prepare(`INSERT INTO questionnaire_options (question_field_name, option_value) VALUES (?, ?)`);
    questionnaireOptionsToSeed.forEach(option => questionnaireOptionsStmt.run(Object.values(option)));
    questionnaireOptionsStmt.finalize();

    const traineeStmt = db.prepare(`INSERT INTO trainees (forename, surname, sponsor, sentry_number) VALUES (?, ?, ?, ?)`);
    traineesToSeed.forEach(trainee => traineeStmt.run(Object.values(trainee)));
    traineeStmt.finalize();

    const competencyStmt = db.prepare(`INSERT INTO competencies (name) VALUES (?)`);
    competenciesToSeed.forEach(c => competencyStmt.run(c.name));
    competencyStmt.finalize();

    // Add comments to 5 random trainees
    db.run("UPDATE trainees SET additional_comments = 'Requires extra support with reading.' WHERE id = 1");
    db.run("UPDATE trainees SET additional_comments = 'Has a slight hearing impairment.' WHERE id = 3");
    db.run("UPDATE trainees SET additional_comments = 'Allergic to nuts.' WHERE id = 5");
    db.run("UPDATE trainees SET additional_comments = 'Anxious in group settings.' WHERE id = 7");
    db.run("UPDATE trainees SET additional_comments = 'Colour-blind (red-green).' WHERE id = 9");
});

// Chain course and datapack seeding to run after the initial seeding
db.all('SELECT id FROM competencies', [], (err, competencies) => {
    if (err) {
        console.error('Could not fetch competencies:', err.message);
        return;
    }

    const competencyIds = competencies.map(c => c.id);

    db.serialize(() => {
        const courseStmt = db.prepare(`INSERT INTO courses (name, doc_ids, competency_ids) VALUES (?, ?, ?)`);
        coursesToSeed.forEach(course => {
            const numCompetencies = Math.floor(Math.random() * 3) + 3; // 3 to 5
            const selectedCompetencyIds = [...competencyIds].sort(() => 0.5 - Math.random()).slice(0, numCompetencies);
            courseStmt.run(course.name, course.doc_ids, selectedCompetencyIds.join(','));
        });
        courseStmt.finalize();

        const datapackStmt = db.prepare(`INSERT INTO datapack (course_id, trainer_id, start_date, duration, total_trainee_count, trainee_ids) VALUES (?, ?, ?, ?, ?, ?)`);
        datapackToSeed.forEach(dp => datapackStmt.run(Object.values(dp)));
        datapackStmt.finalize();

        console.log('Database initialization complete.');

        // Close the database connection here to ensure it's the last step
        db.close((err) => {
            if (err) console.error('Error closing database:', err.message);
            else console.log('Database connection closed.');
        });
    });
}); 