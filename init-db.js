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
    { name: 'trainees', schema: `CREATE TABLE trainees (id INTEGER PRIMARY KEY AUTOINCREMENT, forename TEXT NOT NULL, surname TEXT NOT NULL, sponsor TEXT, sentry_number TEXT, additional_comments TEXT, datapack INTEGER)` },
    { name: 'courses', schema: `CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT, doc_ids TEXT, competency_ids TEXT, course_length INTEGER)` },
    { name: 'documents', schema: `CREATE TABLE documents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, scope TEXT, visible TEXT)` },
    { name: 'questionnaires', schema: `CREATE TABLE questionnaires (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, section TEXT, question_text TEXT NOT NULL, input_type TEXT NOT NULL, field_name TEXT NOT NULL, access TEXT, has_comments TEXT DEFAULT 'NO', FOREIGN KEY (document_id) REFERENCES documents(id))` },
    { name: 'questionnaire_options', schema: `CREATE TABLE questionnaire_options (id INTEGER PRIMARY KEY AUTOINCREMENT, question_field_name TEXT NOT NULL, option_value TEXT NOT NULL)` },
    { name: 'responses', schema: `CREATE TABLE responses (id INTEGER PRIMARY KEY AUTOINCREMENT, datapack_id INTEGER NOT NULL, document_id INTEGER NOT NULL, trainee_ids TEXT, field_name TEXT NOT NULL, response_data TEXT, completed BOOLEAN DEFAULT 0, additional_comments TEXT, FOREIGN KEY (datapack_id) REFERENCES datapack(id), FOREIGN KEY (document_id) REFERENCES documents(id), UNIQUE(datapack_id, document_id, field_name))` },
    { name: 'competencies', schema: `CREATE TABLE competencies (id INTEGER PRIMARY KEY, name TEXT)` },
    { name: 'datapack', schema: `CREATE TABLE datapack (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, trainer_id INTEGER, start_date TEXT, duration INTEGER, total_trainee_count INTEGER, trainee_ids TEXT)` },
    { name: 'permissions', schema: `CREATE TABLE IF NOT EXISTS permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL)` },
    { name: 'incomplete_registers', schema: `CREATE TABLE IF NOT EXISTS incomplete_registers (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, trainer_id INTEGER, start_date TEXT, duration INTEGER, trainees_json TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
];

// --- Seed Data ---
const usersToSeed = [
    { forename: 'Aditya', surname: 'Chaubey', role: 'dev', username: 'aditya', password: 'chaubey' },
    { forename: 'Mick', surname: 'Lamont', role: 'admin', username: 'mick', password: 'lamont' },
    { forename: 'George', surname: 'Penman', role: 'trainer', username: 'george', password: 'penman' },
    { forename: 'Stewart', surname: 'Roxburgh', role: 'trainer', username: 'stewart', password: 'roxburgh' },
    { forename: 'Brenda', surname: 'Moore', role: 'admin', username: 'brenda', password: 'moore' },
    // --- Migrated Trainees ---
    { forename: 'John', surname: 'Doe', role: 'candidate', username: 'johndoe', password: 'doe' },
    { forename: 'Jane', surname: 'Smith', role: 'candidate', username: 'janesmith', password: 'smith' },
    { forename: 'Jim', surname: 'Beam', role: 'candidate', username: 'jimbeam', password: 'beam' },
    { forename: 'Jim', surname: 'Brown', role: 'candidate', username: 'jimbrown', password: 'brown' },
    { forename: 'Alice', surname: 'Johnson', role: 'candidate', username: 'alicejohnson', password: 'johnson' },
    { forename: 'Bob', surname: 'Williams', role: 'candidate', username: 'bobwilliams', password: 'williams' },
    { forename: 'Eve', surname: 'Davis', role: 'candidate', username: 'evedavis', password: 'davis' },
    { forename: 'Charlie', surname: 'Miller', role: 'candidate', username: 'charliemiller', password: 'miller' },
    { forename: 'Grace', surname: 'Taylor', role: 'candidate', username: 'gracetaylor', password: 'taylor' },
    { forename: 'Liam', surname: 'Anderson', role: 'candidate', username: 'liamanderson', password: 'anderson' }
];
const competenciesToSeed = [
    { name: 'PTS' },
    { name: 'DCCR' },
    { name: 'COSS' },
    { name: 'OLP' },
    { name: 'PC' },
];
const coursesToSeed = [
    { id: 1, name: 'PTS', doc_ids: '1,2,3,4,5,6,7,8', competency_ids: '1,2,3,4', course_length: 1 }, 
    { id: 2, name: 'PTS Recert', doc_ids: '1,2,4,5,6', competency_ids: '1,3,4', course_length: 2 }, 
    { id: 3, name: 'COSS Initial', doc_ids: '1,2,4,5,6', competency_ids: '3,4,5', course_length: 5 }
];
const documentsToSeed = [
    { name: 'Register', scope: 'course', visible: 'dev,admin,trainer' },
    { name: 'TrainingCourseChecklist', scope: 'course', visible: 'dev,admin,trainer' },
    { name: 'TrainingAndWeldingTrackSafetyBreifing', scope: 'course', visible: 'dev,admin,trainer' },
    { name: 'Pre Course', scope: 'candidate', visible: 'dev' },
    { name: 'Post Course', scope: 'candidate', visible: 'dev' },
    { name: 'LeavingForm', scope: 'candidate', visible: 'dev,admin,trainer' },
    { name: 'PhoneticQuiz', scope: 'candidate', visible: 'dev,admin,trainer' },
    { name: 'EmergencyPhoneCallExercise', scope: 'candidate', visible: 'dev,admin,trainer' }
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
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Issued Certificate/s', input_type: 'tri_toggle', field_name: 'issued_certs', access: 'trainer', has_comments: 'YES' },

    // TrainingAndWeldingTrackSafetyBreifing Questions (document_id = 3)
    { document_id: 3, section: 'HEADER', question_text: 'Start Time', input_type: 'time_capture_button', field_name: 'start_time', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'HEADER', question_text: 'Finish Time', input_type: 'time_capture_button', field_name: 'finish_time', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'ATTENDEES', question_text: 'Trainee Signatures', input_type: 'signature_grid', field_name: 'trainee_signatures', access: 'trainer', has_comments: 'NO' },
    
    // Practical Elements
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Crosses the line correctly', input_type: 'checkbox', field_name: 'prac_crosses_line', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates 1.25m (4ft) from the nearest rail', input_type: 'checkbox', field_name: 'prac_dist_1_25m', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates 2m (6ft 6") from the nearest rail', input_type: 'checkbox', field_name: 'prac_dist_2m', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates on or near the line', input_type: 'checkbox', field_name: 'prac_near_line', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates 2.75m (9ft)', input_type: 'checkbox', field_name: 'prac_dist_2_75m', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies or states Limited Clearance, No Refuges, No Safe Access while trains are running signs', input_type: 'checkbox', field_name: 'prac_limited_clearance', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies local examples of signalling equipment (e.g. IRJs for track signalling, axle counters, AWS magnets etc).', input_type: 'checkbox', field_name: 'prac_signalling_equipment', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates distance for tool', input_type: 'checkbox', field_name: 'prac_tool_distance', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates emergency detonator protection', input_type: 'checkbox', field_name: 'prac_detonator_protection', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies overhead line equipment', input_type: 'checkbox', field_name: 'prac_overhead_line_equipment', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Acknowledges warnings', input_type: 'checkbox', field_name: 'prac_acknowledges_warnings', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies hazards at station', input_type: 'checkbox', field_name: 'prac_hazards_at_station', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies equipment at station', input_type: 'checkbox', field_name: 'prac_equipment_at_station', access: 'trainer', has_comments: 'NO' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies landmarks that can be used for emergency call location', input_type: 'checkbox', field_name: 'prac_emergency_landmarks', access: 'trainer', has_comments: 'NO' },

    { document_id: 3, section: 'FOOTER', question_text: 'Trainer Signature', input_type: 'signature_box', field_name: 'briefing_trainer_signature', access: 'trainer', has_comments: 'NO' },

    // Pre-Course Questions (document_id = 4)
    { document_id: 4, section: 'EQUALITY & DIVERSITY', question_text: 'Gender', input_type: 'dropdown', field_name: 'pre_gender', access: 'candidate', has_comments: 'NO' },
    { document_id: 4, section: 'EQUALITY & DIVERSITY', question_text: 'Age', input_type: 'dropdown', field_name: 'pre_age', access: 'candidate', has_comments: 'NO' },
    { document_id: 4, section: 'EQUALITY & DIVERSITY', question_text: 'Nationality', input_type: 'dropdown', field_name: 'pre_nationality', access: 'candidate', has_comments: 'NO' },
    { document_id: 4, section: 'EQUALITY & DIVERSITY', question_text: 'Ethnicity', input_type: 'dropdown', field_name: 'pre_ethnicity', access: 'candidate', has_comments: 'NO' },
    
    { document_id: 4, section: 'SUPPORT', question_text: 'Do you have any disabilities or health issues that you would like to make us aware of?', input_type: 'dropdown', field_name: 'pre_disabilities_q', access: 'candidate', has_comments: 'NO' },
    { document_id: 4, section: 'SUPPORT', question_text: 'If yes please provide details:', input_type: 'textarea', field_name: 'pre_disabilities_details', access: 'candidate', has_comments: 'NO' },
    { document_id: 4, section: 'SUPPORT', question_text: 'Do you have any learning difficulties you would like to make us aware of?', input_type: 'dropdown', field_name: 'pre_learning_difficulties_q', access: 'candidate', has_comments: 'NO' },
    { document_id: 4, section: 'SUPPORT', question_text: 'If yes please provide details:', input_type: 'textarea', field_name: 'pre_learning_difficulties_details', access: 'candidate', has_comments: 'NO' },

    { document_id: 4, section: 'SELF-ASSESSMENT', question_text: 'Please consider the level of confidence and understanding you have in relation to the course you are about to undertake', input_type: 'dropdown', field_name: 'pre_self_assessment_score', access: 'candidate', has_comments: 'NO' },

    // LeavingForm Questions (document_id = 6)
    { document_id: 6, section: 'MAIN', question_text: 'Reasons for leaving', input_type: 'textarea', field_name: 'leaving_reasons', access: 'trainer', has_comments: 'NO' },
    { document_id: 6, section: 'MAIN', question_text: 'Candidate Signature', input_type: 'signature_box', field_name: 'leaving_candidate_signature', access: 'trainerl.l;', has_comments: 'NO' },
    { document_id: 6, section: 'MAIN', question_text: 'Trainer Signature', input_type: 'signature_box', field_name: 'leaving_trainer_signature', access: 'trainer', has_comments: 'NO' },
    { document_id: 6, section: 'MAIN', question_text: 'Date of leaving', input_type: 'date', field_name: 'leaving_date', access: 'trainer', has_comments: 'NO' }
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
    
    // Pre-course options
    ...['Male', 'Female', 'Other', 'Prefer Not To Say'].map(o => ({ question_field_name: 'pre_gender', option_value: o })),
    ...['16-24', '25-39', '40+', 'Prefer Not To Say'].map(o => ({ question_field_name: 'pre_age', option_value: o })),
    ...['English', 'British', 'Scottish', 'Welsh', 'Northern Irish', 'European', 'Other', 'Prefer Not Say'].map(o => ({ question_field_name: 'pre_nationality', option_value: o })),
    ...['White', 'Black', 'Mixed Race', 'Asian', 'African', 'Gypsy/Traveller', 'Indian', 'Pakistani', 'Bangladeshi', 'Chinese', 'Other', 'Prefer Not To Say'].map(o => ({ question_field_name: 'pre_ethnicity', option_value: o })),
    ...['Yes', 'No'].map(o => ({ question_field_name: 'pre_disabilities_q', option_value: o })),
    ...['Yes', 'No'].map(o => ({ question_field_name: 'pre_learning_difficulties_q', option_value: o })),
    ...['1', '2', '3', '4', '5'].map(o => ({ question_field_name: 'pre_self_assessment_score', option_value: o })),
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
    { forename: 'John', surname: 'Doe', sponsor: 'SWGR', sentry_number: '123456', datapack: 1 }, 
    { forename: 'Jane', surname: 'Smith', sponsor: 'Network Rail', sentry_number: '654321', datapack: 2 },
    { forename: 'Jim', surname: 'Beam', sponsor: 'SWGR', sentry_number: '123456', datapack: 2 },
    { forename: 'Jim', surname: 'Brown', sponsor: 'SWGR', sentry_number: '123456', datapack: 2 },
    { forename: 'Alice', surname: 'Johnson', sponsor: 'Network Rail', sentry_number: '987654', datapack: 3 },
    { forename: 'Bob', surname: 'Williams', sponsor: 'Babcock', sentry_number: '456789', datapack: 3 },
    { forename: 'Eve', surname: 'Davis', sponsor: 'SWGR', sentry_number: '321654', datapack: 4 },
    { forename: 'Charlie', surname: 'Miller', sponsor: 'Siemens', sentry_number: '789123', datapack: 4 },
    { forename: 'Grace', surname: 'Taylor', sponsor: 'Amey', sentry_number: '147258', datapack: 5 },
    { forename: 'Liam', surname: 'Anderson', sponsor: 'Colas Rail', sentry_number: '258369', datapack: 5 }
];
const datapackToSeed = [
    { course_id: 1, trainer_id: 3, start_date: '2025-06-30', duration: 1, total_trainee_count: 1, trainee_ids: '1' },
    { course_id: 2, trainer_id: 4, start_date: '2025-06-29', duration: 2, total_trainee_count: 3, trainee_ids: '2,3,4' },
    { course_id: 3, trainer_id: 3, start_date: '2025-06-26', duration: 5, total_trainee_count: 2, trainee_ids: '5,6' },
    { course_id: 1, trainer_id: 4, start_date: '2025-07-01', duration: 1, total_trainee_count: 2, trainee_ids: '7,8' },
    { course_id: 3, trainer_id: 3, start_date: '2025-06-27', duration: 5, total_trainee_count: 2, trainee_ids: '9,10' }
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

    const docStmt = db.prepare(`INSERT INTO documents (name, scope, visible) VALUES (?, ?, ?)`);
    documentsToSeed.forEach(doc => docStmt.run(doc.name, doc.scope, doc.visible));
    docStmt.finalize();

    const courseStmt = db.prepare(`INSERT INTO courses (id, name, doc_ids, competency_ids, course_length) VALUES (?, ?, ?, ?, ?)`);
    coursesToSeed.forEach(course => courseStmt.run(course.id, course.name, course.doc_ids, course.competency_ids, course.course_length));
    courseStmt.finalize();

    const questionnaireStmt = db.prepare(`INSERT INTO questionnaires (document_id, section, question_text, input_type, field_name, access, has_comments) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    questionnairesToSeed.forEach(q => questionnaireStmt.run([q.document_id, q.section, q.question_text, q.input_type, q.field_name, q.access, q.has_comments || 'NO']));
    questionnaireStmt.finalize();

    const questionnaireOptionsStmt = db.prepare(`INSERT INTO questionnaire_options (question_field_name, option_value) VALUES (?, ?)`);
    questionnaireOptionsToSeed.forEach(option => questionnaireOptionsStmt.run(Object.values(option)));
    questionnaireOptionsStmt.finalize();

    const traineeStmt = db.prepare(`INSERT INTO trainees (forename, surname, sponsor, sentry_number, datapack) VALUES (?, ?, ?, ?, ?)`);
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

    // Create a trigger to update the updated_at column on row update
    db.run(`
        CREATE TRIGGER IF NOT EXISTS update_incomplete_registers_updated_at
        AFTER UPDATE ON incomplete_registers
        FOR EACH ROW
        BEGIN
            UPDATE incomplete_registers SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;
    `);

    // Create and populate the course_folders table
    db.run(`
        CREATE TABLE IF NOT EXISTS course_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            folder_name TEXT NOT NULL,
            FOREIGN KEY (course_id) REFERENCES courses(id)
        );
    `);
    
    const ptsFolders = ['Phonetic Quiz', 'Emergency Phone Call Exercise'];
    const ptsCourseIds = [1, 2]; // Assuming 1=PTS Initial, 2=PTS Recert
    const folderStmt = db.prepare('INSERT INTO course_folders (course_id, folder_name) VALUES (?, ?)');
    
    ptsCourseIds.forEach(courseId => {
        ptsFolders.forEach(folderName => {
            folderStmt.run(courseId, folderName);
        });
    });
    folderStmt.finalize();

    // Populate default permissions
    const defaultPermissions = [
        // Admin can do anything
        { role: 'admin', action: 'ALL', resource: 'ALL' },
        { role: 'dev', action: 'ALL', resource: 'ALL' },
        { role: 'trainer', action: 'ALL', resource: 'ALL' },
        { role: 'candidate', action: 'ALL', resource: 'ALL' },
    ];

    const permissionStmt = db.prepare(`INSERT INTO permissions (role, action, resource) VALUES (?, ?, ?)`);
    defaultPermissions.forEach(p => permissionStmt.run(Object.values(p)));
    permissionStmt.finalize();
});

// Chain course and datapack seeding to run after the initial seeding
db.all('SELECT id FROM competencies', [], (err, competencies) => {
    if (err) {
        console.error('Could not fetch competencies:', err.message);
        return;
    }

    const competencyIds = competencies.map(c => c.id);

    db.serialize(() => {
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