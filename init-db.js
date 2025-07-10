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
    { name: 'trainees', schema: `CREATE TABLE trainees (id INTEGER PRIMARY KEY AUTOINCREMENT, forename TEXT NOT NULL, surname TEXT NOT NULL, sponsor TEXT, sentry_number TEXT, additional_comments TEXT, datapack INTEGER, sub_sponsor BOOLEAN DEFAULT 0)` },
    { name: 'courses', schema: `CREATE TABLE courses (id INTEGER PRIMARY KEY, name TEXT, doc_ids TEXT, competency_ids TEXT, course_length INTEGER, non_mandatory_doc_ids TEXT)` },
    { name: 'documents', schema: `CREATE TABLE documents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, scope TEXT, visible TEXT, location TEXT, type TEXT, save TEXT)` },
    { name: 'questionnaires', schema: `CREATE TABLE questionnaires (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, section TEXT, question_text TEXT NOT NULL, input_type TEXT NOT NULL, field_name TEXT NOT NULL, access TEXT, has_comments TEXT DEFAULT 'NO', required TEXT DEFAULT 'yes', dependency TEXT DEFAULT '', FOREIGN KEY (document_id) REFERENCES documents(id))` },
    { name: 'questionnaire_options', schema: `CREATE TABLE questionnaire_options (id INTEGER PRIMARY KEY AUTOINCREMENT, question_field_name TEXT NOT NULL, option_value TEXT NOT NULL)` },
    { name: 'responses', schema: `CREATE TABLE responses (id INTEGER PRIMARY KEY AUTOINCREMENT, datapack_id INTEGER NOT NULL, document_id INTEGER NOT NULL, trainee_ids TEXT, field_name TEXT NOT NULL, response_data TEXT, completed BOOLEAN DEFAULT 0, additional_comments TEXT, FOREIGN KEY (datapack_id) REFERENCES datapack(id), FOREIGN KEY (document_id) REFERENCES documents(id), UNIQUE(datapack_id, document_id, field_name))` },
    { name: 'competencies', schema: `CREATE TABLE competencies (id INTEGER PRIMARY KEY, name TEXT)` },
    { name: 'datapack', schema: `CREATE TABLE datapack (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, trainer_id INTEGER, start_date TEXT, duration INTEGER, total_trainee_count INTEGER, trainee_ids TEXT, status TEXT)` },
    { name: 'permissions', schema: `CREATE TABLE IF NOT EXISTS permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL)` },
    { name: 'document_progress', schema: `CREATE TABLE IF NOT EXISTS document_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, datapack_id INTEGER NOT NULL, document_id INTEGER NOT NULL, trainee_id INTEGER, completion_percentage INTEGER NOT NULL, UNIQUE(datapack_id, document_id, trainee_id))` },
    { name: 'flags', schema: `CREATE TABLE flags (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, datapack_id INTEGER, document_id INTEGER, trainee_id INTEGER, user_id INTEGER NOT NULL, user_sent_to_id INTEGER NOT NULL, message TEXT NOT NULL, page TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT (datetime('now')), attempted_by TEXT, picked_up_at TEXT, dropped_at TEXT, resolved_at TEXT, 
        resolved_by INTEGER, resolution_notes TEXT, signature TEXT, FOREIGN KEY (datapack_id) REFERENCES datapack(id), FOREIGN KEY (document_id) REFERENCES documents(id), FOREIGN KEY (trainee_id) REFERENCES trainees(id), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (user_sent_to_id) REFERENCES users(id), FOREIGN KEY (resolved_by) REFERENCES users(id))` },
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
    { name: 'PTS AC' },
    { name: 'PTS DCCR' },
    { name: 'PS' },
    { name: 'COSS OLP' },
    { name: 'COSS CRP LLT' },
    { name: 'PC' },
    { name: 'ES' },
    { name: 'PICOP' },
    { name: 'IWA' },
    { name: 'COSS' },
    { name: 'SPICOP' },
    { name: 'SSOWP' },
    { name: 'Site Warden' },
    { name: 'Points Op' },
    { name: 'LXA' },
    { name: 'SUOTE' },
    { name: 'Track Induction OLEC 1' },
    { name: 'OLEC 2' },
    { name: 'Element 1' },
    { name: 'Element 2' },
    { name: 'Element 3' },
    { name: 'Element 4' },
    { name: 'Element 5' },
    { name: 'Element 6' },
    { name: 'AP' },
    { name: 'NP' },
    { name: 'SAI NP' },
    { name: 'SAI DI' },
    { name: 'SAI ERAS' }
];
const coursesToSeed = [
    { id: 1, name: 'PTS Initial', doc_ids: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31', competency_ids: '1', course_length: 1, non_mandatory_doc_ids: '7,8' }, 
    { id: 2, name: 'PTS Recert', doc_ids: '1,2,3,9,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31', competency_ids: '1', course_length: 2, non_mandatory_doc_ids: '' }, 
    { id: 3, name: 'PTS DCCR', doc_ids: '1,2,3,4,5,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31', competency_ids: '2', course_length: 5, non_mandatory_doc_ids: '' }
];
const documentsToSeed = [
    { name: 'Register', scope: 'course', visible: 'dev,admin,trainer', location: 'General', type: 'questionnaire', save: 'course documentation' },
    { name: 'TrainingCourseChecklist', scope: 'course', visible: 'dev,admin,trainer', location: 'General', type: 'questionnaire', save: 'main' },
    { name: 'TrainingAndWeldingTrackSafetyBreifing', scope: 'course', visible: 'dev,admin,trainer', location: 'PTS', type: 'questionnaire', save: 'course documentation' },
    { name: 'Pre Course', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'questionnaire', save: 'candidate name' },
    { name: 'Post Course', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'questionnaire', save: 'candidate name' },
    { name: 'LeavingForm', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'questionnaire', save: 'candidate name' },
    { name: 'PhoneticQuiz', scope: 'candidate', visible: 'dev,admin,trainer', location: 'PTS', type: 'scanned pdf', save: 'additional exercises contents' },
    { name: 'EmergencyPhoneCallExercise', scope: 'candidate', visible: 'dev,admin,trainer', location: 'PTS', type: 'scanned pdf', save: 'additional exercises contents' },
    { name: 'ProgressRecord', scope: 'course', visible: 'dev,admin,trainer', location: 'General', type: 'questionnaire', save: 'course documentation' },
    { name: 'DeviationForm', scope: 'course', visible: 'dev,admin,trainer', location: 'General', type: 'questionnaire', save: 'course documentation' },
    { name: 'PracticalAssessmentIndividual', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'candidate name' },
    { name: 'RecertEmergencyCallPracticalAssessment', scope: 'candidate', visible: 'dev,admin,trainer', location: 'PTS', type: 'scanned pdf', save: 'course documentation' },
    { name: 'TrackWalkDeliveryRequirements', scope: 'course', visible: 'dev,admin,trainer', location: 'PTS', type: 'scanned pdf', save: 'course documentation' },
    { name: 'GeneralTrackVisitForm', scope: 'course', visible: 'dev,admin,trainer', location: 'General', type: 'questionnaire', save: 'course documentation' },
    { name: 'Swipes', scope: 'course', visible: 'dev,admin,trainer', location: 'General', type: 'scanned photo', save: 'course documentation' },
    { name: 'SWP', scope: 'course', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'course documentation' },
    { name: 'LogbookEntries', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned photo', save: 'candidate name' },
    { name: 'PhotographicID', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned photo', save: 'candidate name' },
    { name: 'QuestionnaireAndFeedbackForm', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'candidate name' },
    { name: 'Workbook', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'candidate name' },
    { name: 'KnowledgeAssessment', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'candidate name' },
    { name: 'ScenarioAssessment', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'candidate name' },
    { name: 'AssessmentReview', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'candidate name' },
    { name: 'Certificates', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'candidate name' },
    { name: 'IssueOfLogbook', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'candidate name' },
    { name: 'PracticalAssessmentGroup', scope: 'candidate', visible: 'dev,admin,trainer', location: 'General', type: 'scanned pdf', save: 'course documentation' },
    // Admin Documents
    { name: 'BookingForm', scope: 'admin', visible: 'dev,admin', location: 'Admin', type: 'scanned pdf', save: 'booking form and joining instructions' },
    { name: 'JoiningInstructions', scope: 'admin', visible: 'dev,admin', location: 'Admin', type: 'scanned pdf', save: 'booking form and joining instructions' },
    { name: 'EmailConfirmation', scope: 'admin', visible: 'dev,admin', location: 'Admin', type: 'email', save: 'booking form and joining instructions' },
    { name: 'SubSponsorPaperwork', scope: 'admin', visible: 'dev,admin', location: 'Admin', type: 'scanned pdf', save: 'sub sponsor request' },
    { name: 'SponsorsNotificationOfResults', scope: 'admin', visible: 'dev,admin', location: 'Admin', type: 'scanned pdf', save: 'admin' },
    { name: 'SentinelNotificationOfResults', scope: 'admin', visible: 'dev,admin', location: 'Admin', type: 'scanned pdf', save: 'admin' },
    { name: 'SentinelPreChecks', scope: 'admin', visible: 'dev,admin', location: 'Admin', type: 'scanned pdf', save: 'candidate name' },
];
const questionnairesToSeed = [
    // Register Questions (document_id = 1)
    { document_id: 1, section: 'HEADER', question_text: 'NWR Toolkit No', input_type: 'number', field_name: 'nwr_toolkit_no', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 1, section: 'HEADER', question_text: 'Resources Fit For Purpose', input_type: 'checkbox', field_name: 'resources_fit_for_purpose', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },  
    { document_id: 1, section: 'HEADER', question_text: 'Resources', input_type: 'dropdown', field_name: 'resources', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    
    // Dynamically generate from day 1 to 14 days of attendance questions
    ...Array.from({ length: 21 }, (_, i) => ({
        document_id: 1,
        section: 'MAIN',
        question_text: `Day ${i + 1}`,
        input_type: 'signature_grid',
        field_name: `day_${i + 1}_attendance`,
        access: 'trainer',
        has_comments: 'NO',
        required: 'yes',
        dependency: ''
    })),
    { document_id: 1, section: 'HEADER', question_text: 'Level of spoken English adequate', input_type: 'trainee_dropdown_grid', field_name: 'level_of_spoken_english_adequate', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 1, section: 'MAIN', question_text: 'Final Result', input_type: 'trainee_dropdown_grid', field_name: 'final_result', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 1, section: 'MAIN', question_text: 'Sentinel Notified Date', input_type: 'trainee_date_grid', field_name: 'sentinel_notified_date', access: 'admin', has_comments: 'NO', required: 'yes', dependency: '' },

    // New comment and signature sections for the Register
    { document_id: 1, section: 'FOOTER', question_text: 'Trainer Comments', input_type: 'textarea', field_name: 'trainer_comments', access: 'trainer', has_comments: 'NO', required: 'no', dependency: '' },
    { document_id: 1, section: 'FOOTER', question_text: 'Trainer Signature', input_type: 'signature_box', field_name: 'trainer_signature', access: 'trainer', has_comments: 'NO', required: 'dependant', dependency: 'trainer_comments' },
    { document_id: 1, section: 'FOOTER', question_text: 'Admin Comments', input_type: 'textarea', field_name: 'admin_comments', access: 'admin', has_comments: 'NO', required: 'no', dependency: '' },
    { document_id: 1, section: 'FOOTER', question_text: 'Admin Signature', input_type: 'signature_box', field_name: 'admin_signature', access: 'admin', has_comments: 'NO', required: 'dependant', dependency: 'admin_comments' },

    // TrainingCourseChecklist Questions (document_id = 2)
    // -- PRE COURSE CHECKS --
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Global Train Capability (Sentinel)', input_type: 'tri_toggle', field_name: 'gtc_sentinel', access: 'admin', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Trainer Capability (Sentinel)', input_type: 'tri_toggle', field_name: 'tc_sentinel', access: 'admin', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Course Attendance Form (Ensure NWR Toolkit Red are completed)', input_type: 'tri_toggle', field_name: 'caf_nwr', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Progress Record', input_type: 'tri_toggle', field_name: 'progress_record', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'For Trainers Sub Sponsored: Sub Sponsorship Paperwork and Approval', input_type: 'tri_toggle', field_name: 'sponsorship_approval', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Booking Form', input_type: 'tri_toggle', field_name: 'booking_form', access: 'admin', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Joining Instructions', input_type: 'tri_toggle', field_name: 'joining_instructions', access: 'admin', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Practical Track Visit Briefing Forms and SWP', input_type: 'tri_toggle', field_name: 'track_visit_swp', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Sentinel Notification Report', input_type: 'tri_toggle', field_name: 'sentinel_notification', access: 'admin', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Sentinel Sepite in Reports', input_type: 'tri_toggle', field_name: 'sentinel_reports', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'PRE COURSE CHECKS', question_text: 'Issued/Updated log books', input_type: 'tri_toggle', field_name: 'log_books', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    // -- LEARNER PACKS --
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Delegate ID Form', input_type: 'tri_toggle', field_name: 'delegate_id', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Candidate Sentinel Printout', input_type: 'tri_toggle', field_name: 'candidate_sentinel', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Log books entries, electronic, paper', input_type: 'tri_toggle', field_name: 'log_book_entries', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Learner Questionnaire and Feedback Form', input_type: 'tri_toggle', field_name: 'feedback_form', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Course Documentation', input_type: 'tri_toggle', field_name: 'course_docs', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Post Course Training / Assessment Cycle (all Sentinel Courses)', input_type: 'tri_toggle', field_name: 'assessment_cycle', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Certificate of Competence (all Sentinel Courses)', input_type: 'tri_toggle', field_name: 'cert_of_competence', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },
    { document_id: 2, section: 'LEARNER PACKS', question_text: 'Issued Certificate/s', input_type: 'tri_toggle', field_name: 'issued_certs', access: 'trainer', has_comments: 'YES', required: 'yes', dependency: '' },

    // TrainingAndWeldingTrackSafetyBreifing Questions (document_id = 3)
    { document_id: 3, section: 'HEADER', question_text: 'Start Time', input_type: 'time_capture_button', field_name: 'start_time', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'HEADER', question_text: 'Finish Time', input_type: 'time_capture_button', field_name: 'finish_time', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'ATTENDEES', question_text: 'Trainee Signatures', input_type: 'signature_grid', field_name: 'trainee_signatures', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    
    // Practical Elements
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Crosses the line correctly', input_type: 'checkbox', field_name: 'prac_crosses_line', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates 1.25m (4ft) from the nearest rail', input_type: 'checkbox', field_name: 'prac_dist_1_25m', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates 2m (6ft 6") from the nearest rail', input_type: 'checkbox', field_name: 'prac_dist_2m', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates on or near the line', input_type: 'checkbox', field_name: 'prac_near_line', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates 2.75m (9ft)', input_type: 'checkbox', field_name: 'prac_dist_2_75m', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies or states Limited Clearance, No Refuges, No Safe Access while trains are running signs', input_type: 'checkbox', field_name: 'prac_limited_clearance', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies local examples of signalling equipment (e.g. IRJs for track signalling, axle counters, AWS magnets etc).', input_type: 'checkbox', field_name: 'prac_signalling_equipment', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates distance for tool', input_type: 'checkbox', field_name: 'prac_tool_distance', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Demonstrates emergency detonator protection', input_type: 'checkbox', field_name: 'prac_detonator_protection', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies overhead line equipment', input_type: 'checkbox', field_name: 'prac_overhead_line_equipment', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Acknowledges warnings', input_type: 'checkbox', field_name: 'prac_acknowledges_warnings', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies hazards at station', input_type: 'checkbox', field_name: 'prac_hazards_at_station', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies equipment at station', input_type: 'checkbox', field_name: 'prac_equipment_at_station', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 3, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies landmarks that can be used for emergency call location', input_type: 'checkbox', field_name: 'prac_emergency_landmarks', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },

    { document_id: 3, section: 'FOOTER', question_text: 'Trainer Signature', input_type: 'signature_box', field_name: 'briefing_trainer_signature', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },

    // Pre-Course Questions (document_id = 4)
    { document_id: 4, section: 'EQUALITY & DIVERSITY', question_text: 'Gender', input_type: 'dropdown', field_name: 'pre_gender', access: 'candidate', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 4, section: 'EQUALITY & DIVERSITY', question_text: 'Age', input_type: 'dropdown', field_name: 'pre_age', access: 'candidate', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 4, section: 'EQUALITY & DIVERSITY', question_text: 'Nationality', input_type: 'dropdown', field_name: 'pre_nationality', access: 'candidate', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 4, section: 'EQUALITY & DIVERSITY', question_text: 'Ethnicity', input_type: 'dropdown', field_name: 'pre_ethnicity', access: 'candidate', has_comments: 'NO', required: 'yes', dependency: '' },
    
    { document_id: 4, section: 'SUPPORT', question_text: 'Do you have any disabilities or health issues that you would like to make us aware of?', input_type: 'dropdown', field_name: 'pre_disabilities_q', access: 'candidate', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 4, section: 'SUPPORT', question_text: 'If yes please provide details:', input_type: 'textarea', field_name: 'pre_disabilities_details', access: 'candidate', has_comments: 'NO', required: 'dependant', dependency: 'pre_disabilities_q' },
    { document_id: 4, section: 'SUPPORT', question_text: 'Do you have any learning difficulties you would like to make us aware of?', input_type: 'dropdown', field_name: 'pre_learning_difficulties_q', access: 'candidate', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 4, section: 'SUPPORT', question_text: 'If yes please provide details:', input_type: 'textarea', field_name: 'pre_learning_difficulties_details', access: 'candidate', has_comments: 'NO', required: 'dependant', dependency: 'pre_learning_difficulties_q' },

    { document_id: 4, section: 'SELF-ASSESSMENT', question_text: 'Please consider the level of confidence and understanding you have in relation to the course you are about to undertake', input_type: 'dropdown', field_name: 'pre_self_assessment_score', access: 'candidate', has_comments: 'NO', required: 'yes', dependency: '' },

    // LeavingForm Questions (document_id = 6)
    { document_id: 6, section: 'MAIN', question_text: 'Reasons for leaving', input_type: 'textarea', field_name: 'leaving_reasons', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 6, section: 'MAIN', question_text: 'Candidate Signature', input_type: 'signature_box', field_name: 'leaving_candidate_signature', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 6, section: 'MAIN', question_text: 'Trainer Signature', input_type: 'signature_box', field_name: 'leaving_trainer_signature', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 6, section: 'MAIN', question_text: 'Date of leaving', input_type: 'date', field_name: 'leaving_date', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },

    // ProgressRecord Questions (document_id = 9) - Daily time tracking
    ...Array.from({ length: 21 }, (_, i) => ([
        {
            document_id: 9,
            section: `Day ${i + 1}`,
            question_text: 'Start Time',
            input_type: 'time_capture_button',
            field_name: `day_${i + 1}_start_time`,
            access: 'trainer',
            has_comments: 'NO',
            required: 'yes',
            dependency: ''
        },
        {
            document_id: 9,
            section: `Day ${i + 1}`,
            question_text: 'Finish Time',
            input_type: 'time_capture_button',
            field_name: `day_${i + 1}_finish_time`,
            access: 'trainer',
            has_comments: 'NO',
            required: 'yes',
            dependency: ''
        }
    ])).flat(),
    {
        document_id: 9, // ProgressRecord
        section: 'Session Summaries',
        question_text: 'Trainer Comments & Signature',
        input_type: 'dynamic_comments_section',
        field_name: 'progress_record_comments',
        access: 'trainer',
        has_comments: 'NO',
        required: 'yes',
        dependency: ''
    },
    { document_id: 13, section: 'Practical Elements Completed At Test Track', question_text: 'Identifies landmarks that can be used for emergency call location', input_type: 'checkbox', field_name: 'twdr_prac_emergency_landmarks', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 13, section: 'FOOTER', question_text: 'Trainer Signature', input_type: 'signature_box', field_name: 'twdr_trainer_signature', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },

    // GeneralTrackVisitForm Questions (document_id = 14)
    { document_id: 14, section: 'HEADER', question_text: 'Start Time', input_type: 'time_capture_button', field_name: 'start_time', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 14, section: 'HEADER', question_text: 'Finish Time', input_type: 'time_capture_button', field_name: 'finish_time', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 14, section: 'ATTENDEES', question_text: 'Trainee Signatures', input_type: 'signature_grid', field_name: 'trainee_signatures', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },

    // Swipes Questions (document_id = 15)
    { document_id: 15, section: 'MAIN', question_text: 'Upload Signed Document', input_type: 'upload', field_name: 'upload_signed_swipes', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },

    // --- Upload Questions for Scanned/Email Documents ---
    { document_id: 7, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_phoneticquiz', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 8, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_emergencyphonecallexercise', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 11, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_practicalassessmentindividual', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 12, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_recertemergencycallpracticalassessment', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 13, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_trackwalkdeliveryrequirements', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 16, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_swp', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 17, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_logbookentries', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 18, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_photographicid', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 19, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_questionnaireandfeedbackform', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 20, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_workbook', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 21, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_knowledgeassessment', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 22, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_scenarioassessment', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 23, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_assessmentreview', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 24, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_certificates', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 25, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_issueoflogbook', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 26, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_practicalassessmentgroup', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 27, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_bookingform', access: 'admin', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 28, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_joininginstructions', access: 'admin', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 29, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_emailconfirmation', access: 'admin', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 30, section: 'MAIN', question_text: 'Upload Document', input_type: 'sub_sponsor_upload_grid', field_name: 'upload_subsponsorpaperwork', access: 'admin', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 31, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_sponsorsnotificationofresults', access: 'admin', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 32, section: 'MAIN', question_text: 'Upload Document', input_type: 'upload', field_name: 'upload_sentinelnotificationofresults', access: 'admin', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 33, section: 'MAIN', question_text: 'Upload Document', input_type: 'trainee_upload_grid', field_name: 'upload_sentinelprechecks', access: 'admin', has_comments: 'NO', required: 'yes', dependency: '' },
    
    // DeviationForm Questions (document_id = 10)
    { document_id: 10, section: 'MAIN', question_text: 'Reason for Deviation', input_type: 'textarea', field_name: 'deviation_reason', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
    { document_id: 10, section: 'MAIN', question_text: 'Trainer Signature', input_type: 'signature_box', field_name: 'deviation_trainer_signature', access: 'trainer', has_comments: 'NO', required: 'yes', dependency: '' },
];

const checklistQuestionFieldNames = questionnairesToSeed
    .filter(q => q.document_id === 2)
    .map(q => q.field_name);

const flagsToSeed = [
    { title: 'test1', datapack_id: null, document_id: null, trainee_id: null, user_id: 1, user_sent_to_id: 2, message: 'test1', page: 'course', status: 'open' },
    { title: 'test2', datapack_id: null, document_id: null, trainee_id: null, user_id: 1, user_sent_to_id: 5, message: 'test2', page: 'course', status: 'open' },
    { title: 'test3', datapack_id: 5, document_id: 3, trainee_id: null, user_id: 1, user_sent_to_id: 2, message: 'test3', page: 'course', status: 'open' },
    { title: 'test4', datapack_id: 2, document_id: 1, trainee_id: null, user_id: 1, user_sent_to_id: 5, message: 'test4', page: 'course', status: 'open' },
    { title: 'test5', datapack_id: 2, document_id: 12, trainee_id: 4, user_id: 1, user_sent_to_id: 2, message: 'test5', page: 'candidate', status: 'open' },
    { title: 'test6', datapack_id: 2, document_id: 18, trainee_id: 2, user_id: 1, user_sent_to_id: 2, message: 'test6', page: 'candidate', status: 'open' },
    { title: 'test7', datapack_id: 3, document_id: 18, trainee_id: null, user_id: 1, user_sent_to_id: 2, message: 'test7', page: 'users', status: 'open' },
    { title: 'test8', datapack_id: 3, document_id: 18, trainee_id: null, user_id: 1, user_sent_to_id: 2, message: 'test8', page: 'creation', status: 'open' },
    { title: 'test9', datapack_id: 3, document_id: 18, trainee_id: null, user_id: 1, user_sent_to_id: 1, message: 'test9', page: 'admin', status: 'open' },
    { title: 'test10', datapack_id: 3, document_id: 18, trainee_id: null, user_id: 1, user_sent_to_id: 1, message: 'test10', page: 'users', status: 'open' },
];
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
competenciesToSeed.forEach(comp => {
    const field_name = `competency_${comp.name.toLowerCase().replace(/\s/g, '_')}`;
    questionnairesToSeed.push({
        document_id: 1, // Register
        section: 'COMPETENCIES',
        question_text: comp.name,
        input_type: 'trainee_yes_no_grid',
        field_name: field_name,
        access: 'trainer',
        has_comments: 'NO',
        required: 'yes',
        dependency: ''
    });
    questionnaireOptionsToSeed.push(
        { question_field_name: field_name, option_value: 'Competent' },
        { question_field_name: field_name, option_value: 'Not Competent' },
        { question_field_name: field_name, option_value: 'Not Applicable' }
    );
});
const traineesToSeed = [
    { forename: 'John', surname: 'Doe', sponsor: 'SWGR', sentry_number: '123456', datapack: 1, sub_sponsor: true }, 
    { forename: 'Jane', surname: 'Smith', sponsor: 'Network Rail', sentry_number: '654321', datapack: 2, sub_sponsor: false },
    { forename: 'Jim', surname: 'Beam', sponsor: 'SWGR', sentry_number: '123456', datapack: 2, sub_sponsor: true },
    { forename: 'Jim', surname: 'Brown', sponsor: 'SWGR', sentry_number: '123456', datapack: 2, sub_sponsor: false },
    { forename: 'Alice', surname: 'Johnson', sponsor: 'Network Rail', sentry_number: '987654', datapack: 3, sub_sponsor: true },
    { forename: 'Bob', surname: 'Williams', sponsor: 'Babcock', sentry_number: '456789', datapack: 3, sub_sponsor: false },
    { forename: 'Eve', surname: 'Davis', sponsor: 'SWGR', sentry_number: '321654', datapack: 4, sub_sponsor: true },
    { forename: 'Charlie', surname: 'Miller', sponsor: 'Siemens', sentry_number: '789123', datapack: 4, sub_sponsor: false },
    { forename: 'Grace', surname: 'Taylor', sponsor: 'Amey', sentry_number: '147258', datapack: 5, sub_sponsor: true },
    { forename: 'Liam', surname: 'Anderson', sponsor: 'Colas Rail', sentry_number: '258369', datapack: 5, sub_sponsor: false }
];
const datapackToSeed = [
    { course_id: 1, trainer_id: 3, start_date: '2025-06-30', duration: 1, total_trainee_count: 1, trainee_ids: '1', status: 'live' },
    { course_id: 2, trainer_id: 4, start_date: '2025-06-29', duration: 2, total_trainee_count: 3, trainee_ids: '2,3,4', status: 'pre course' },
    { course_id: 3, trainer_id: 3, start_date: '2025-06-26', duration: 5, total_trainee_count: 2, trainee_ids: '5,6', status: 'live' },
    { course_id: 1, trainer_id: 4, start_date: '2025-07-01', duration: 1, total_trainee_count: 2, trainee_ids: '7,8', status: 'pre course' },
    { course_id: 3, trainer_id: 3, start_date: '2025-06-27', duration: 5, total_trainee_count: 2, trainee_ids: '9,10', status: 'live' }
];

const seedFlags = () => {
    const stmt = db.prepare(`INSERT INTO flags (title, datapack_id, document_id, trainee_id, user_id, user_sent_to_id, message, page, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    flagsToSeed.forEach(flag => {
        stmt.run(flag.title, flag.datapack_id, flag.document_id, flag.trainee_id, flag.user_id, flag.user_sent_to_id, flag.message, flag.page, flag.status, (err) => {
            if (err) {
                return console.error('Error inserting flag:', err.message);
            }
        });
    });
    stmt.finalize();
};

db.serialize(() => {
    // Drop and create tables
    console.log('Dropping all tables...');
    db.run(`DROP TABLE IF EXISTS course_folders`);
    db.run(`DROP TABLE IF EXISTS incomplete_registers`);
    db.run(`DROP TRIGGER IF EXISTS update_incomplete_registers_updated_at`);
    db.run(`DROP TABLE IF EXISTS attendance_timers`);
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

    const docStmt = db.prepare(`INSERT INTO documents (name, scope, visible, location, type, save) VALUES (?, ?, ?, ?, ?, ?)`);
    documentsToSeed.forEach(doc => docStmt.run(doc.name, doc.scope, doc.visible, doc.location, doc.type, doc.save));
    docStmt.finalize();

    const courseStmt = db.prepare(`INSERT INTO courses (id, name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids) VALUES (?, ?, ?, ?, ?, ?)`);
    coursesToSeed.forEach(course => courseStmt.run(course.id, course.name, course.doc_ids, course.competency_ids, course.course_length, course.non_mandatory_doc_ids));
    courseStmt.finalize();

    const questionnaireStmt = db.prepare(`INSERT INTO questionnaires (document_id, section, question_text, input_type, field_name, access, has_comments, required, dependency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    questionnairesToSeed.forEach(q => questionnaireStmt.run([
        q.document_id, 
        q.section, 
        q.question_text, 
        q.input_type, 
        q.field_name, 
        q.access, 
        q.has_comments,
        q.required,
        q.dependency
    ]));
    questionnaireStmt.finalize();

    const questionnaireOptionsStmt = db.prepare(`INSERT INTO questionnaire_options (question_field_name, option_value) VALUES (?, ?)`);
    questionnaireOptionsToSeed.forEach(option => questionnaireOptionsStmt.run(Object.values(option)));
    questionnaireOptionsStmt.finalize();

    const traineeStmt = db.prepare(`INSERT INTO trainees (forename, surname, sponsor, sentry_number, datapack, sub_sponsor) VALUES (?, ?, ?, ?, ?, ?)`);
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

    seedFlags();
});

// Chain course and datapack seeding to run after the initial seeding
db.all('SELECT id FROM competencies', [], (err, competencies) => {
    if (err) {
        console.error('Could not fetch competencies:', err.message);
        return;
    }

    const competencyIds = competencies.map(c => c.id);

    db.serialize(() => {
        const datapackStmt = db.prepare(`INSERT INTO datapack (course_id, trainer_id, start_date, duration, total_trainee_count, trainee_ids, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
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