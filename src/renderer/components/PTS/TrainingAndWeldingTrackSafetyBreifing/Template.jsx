import React from 'react';

const Template = ({ 
    logo, 
    issuedBy, 
    courseDate, 
    startTime, 
    finishTime,
    trainees = [],
    responses = {},
    practicalQuestions = [],
}) => {
    const rules = [
        "All staff/trainees that access the SWGR/Global Train training track for courses involving track, welding or overhead line course are subject to standard and mandatory site safety rules for SWGR and Global Train.",
        "All staff will be issued with and will wear mandatory FULL industry specific PPE and task specific items as deemed necessary by the competence being trained: i.e. flame retardant overalls/goggles, safety footwear, correct hard hat and eye protection at all times.",
        "All tools and equipment must be calibrated and used in-line with the training provided and in-line with manufacturer's instruction.",
        "SWGR and Global Train operate a \"Worksafe\" procedure and a close call reporting system, any concerns over working, conditions, equipment or any issue deemed to be unsafe can be reported to the SQEF department.",
        "Site tidiness and good housekeeping is an essential element of working on the training track. All tools, materials and any items used are to be removed after use and the site left tidy, with any defects being reported to the person in-charge or directly to the SQEF department.",
        "All staff accessing the training track or welding facility must be FULLY briefed on these requirements and sign understanding acceptance of these mandatory site rules.",
        "The training facility will be inspected after each course and if any defects or problems noted during the inspection will be highlighted to the relevant individual(s) undertaking activities on or within the vicinity of the training track and welding area.",
        "In the event of an accident or incident, these MUST be reported to the SWGR SQEF department and the training instructor responsible to be recorded and acted upon.",
        "There is to be NO SMOKING on any part of the training facility unless within the designated smoking shelter."
    ];

    const traineeSignatures = responses.trainee_signatures?.data || {};
    const trainerSignature = responses.briefing_trainer_signature?.data;

    return (
        <html lang="en">
        <head>
            <meta charSet="UTF-8" />
            <title>Training & Welding Track Safety Briefing</title>
            <style>
                {`
                    @page { size: A4; margin: 0; }
                    body { font-family: sans-serif; margin: 0; font-size: 11px; }
                    .page { padding: 2rem; page-break-after: always; height: 95%; box-sizing: border-box; }
                    .page:last-of-type { page-break-after: auto; }
                    .header { text-align: center; margin-bottom: 2rem; }
                    .header img { max-width: 180px; }
                    .title { font-size: 14px; font-weight: bold; margin-top: 1rem; text-align: center; margin-bottom: 2rem; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #ccc; }
                    .info-row div { display: flex; flex-direction: column; }
                    .subject-row { font-weight: bold; text-align: center; margin-bottom: 1.5rem; font-size: 12px; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    th, td { border: 1px solid black; padding: 0.5rem; text-align: left; vertical-align: top; }
                    th.num { width: 20px; text-align: center; }
                    .footer-text { margin-top: 1.5rem; font-size: 10px; }
                    .footer-text.red { color: red; font-weight: bold; text-align: center; }
                    .footer-text.contact { text-align: center; border-top: 1px solid black; padding-top: 1rem; margin-top: 2rem; }
                    .page-2-title { font-size: 12px; font-weight: bold; margin-bottom: 1.5rem; text-align: center; }
                    .sig-img { max-width: 100px; max-height: 40px; }
                    .trainer-sig-container { margin-top: 3rem; page-break-inside: avoid; }
                `}
            </style>
        </head>
        <body>
            <div className="page">
                <div className="header">
                    {logo && <img src={logo} alt="Global Train Logo" />}
                </div>
                
                <div className="title">
                    TRAINING & WELDING TRACK SAFETY BRIEFING For PTS Initial Training ONLY
                </div>

                <div className="info-row">
                    <div><strong>Issued by:</strong> {issuedBy}</div>
                    <div><strong>Course Date:</strong> {courseDate}</div>
                    <div><strong>Start Time:</strong> {startTime}</div>
                    <div><strong>Finish Time:</strong> {finishTime}</div>
                </div>

                <div className="subject-row">
                    Site rules for staff and trainees on Global Train Training Track & Welding Area
                </div>

                <table>
                    <tbody>
                        {rules.map((rule, index) => (
                            <tr key={index}>
                                <th className="num">{index + 1}</th>
                                <td>{rule}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="footer-text red">
                    Remember: All accidents/incidents and near misses MUST be reported immediately to both Client and SWGR Control.
                </div>

                <div className="footer-text contact">
                    <strong>FURTHER ACTION</strong><br/>
                    Should you have any queries with any of the above or wish to discuss any safety related matter in confidence or in conjunction with your own line manager, please do not hesitate to contact the SQE & Facilities Dept on 0141 557 6133
                </div>
            </div>

            <div className="page">
                <div className="header">
                    {logo && <img src={logo} alt="Global Train Logo" />}
                </div>

                <div className="page-2-title">Training Track & Welding Area Safety Briefing</div>

                <table>
                    <thead>
                        <tr>
                            <th>NAME</th>
                            <th>SIGNATURE</th>
                            <th>DATE</th>
                            <th>PTS NUMBER</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trainees.map((trainee) => (
                            <tr key={trainee.id}>
                                <td>{`${trainee.forename} ${trainee.surname}`}</td>
                                <td>
                                    {traineeSignatures[trainee.id] && String(traineeSignatures[trainee.id]).startsWith('data:image') &&
                                        <img src={traineeSignatures[trainee.id]} alt="Signature" className="sig-img" />
                                    }
                                </td>
                                <td>{courseDate}</td>
                                <td>{trainee.sentry_number}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <br />

                <table>
                    <thead>
                        <tr>
                            <th>Practical Elements Completed At Test Track</th>
                            <th>Signed by Trainer</th>
                        </tr>
                    </thead>
                    <tbody>
                        {practicalQuestions.map(q => (
                            <tr key={q.field_name}>
                                <td>{q.question_text}</td>
                                <td style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                                    <span>&#10003;</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="trainer-sig-container">
                    <strong>Trainer Signature:</strong>
                    {trainerSignature &&
                        <img src={trainerSignature} alt="Trainer Signature" style={{ borderBottom: '1px solid black', paddingBottom: '5px', maxHeight: '60px' }} />
                    }
                </div>
            </div>
        </body>
        </html>
    );
};

export default Template; 