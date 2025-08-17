import React from 'react';

const Template = ({ courseName, trainerName, eventDetails, logoBase64, responses }) => {
    // Correctly parse the JSON string from responsesMap
    const commentsDataString = responses.progress_record_summaries || '{}';
    let commentsData = {};
    try {
        commentsData = JSON.parse(commentsDataString);
    } catch (e) {
        console.error("Failed to parse comments data:", e);
    }

    const summaries = commentsData.comments || [];
    const signature = responses.progress_record_signature || '';

    return (
        <html>
            <head>
                <style>{`
                    body { font-family: sans-serif; }
                    .container { padding: 20px; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                    .logo { height: 50px; }
                    .title { font-size: 24px; font-weight: bold; }
                    .details { margin-top: 20px; }
                    .section { margin-top: 30px; }
                    .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
                    ol { list-style-position: inside; padding-left: 0; }
                    li { margin-bottom: 10px; }
                    .signature-box { border: 1px solid #ccc; height: 150px; width: 300px; margin-top: 10px; }
                    .signature-img { max-height: 100%; max-width: 100%; }
                `}</style>
            </head>
            <body>
                <div className="container">
                    <div className="header">
                        <span className="title">Progress Record</span>
                        {logoBase64 && <img src={logoBase64} className="logo" alt="Logo" />}
                    </div>
                    <div className="details">
                        <p><strong>Course:</strong> {courseName}</p>
                        <p><strong>Date:</strong> {new Date(eventDetails.start_date).toLocaleDateString('en-GB')}</p>
                        <p><strong>Trainer:</strong> {trainerName}</p>
                    </div>
                    <div className="section">
                        <div className="section-title">Session Summaries</div>
                        <ol>
                            {summaries.map((summary, index) => (
                                <li key={index}>{summary}</li>
                            ))}
                        </ol>
                    </div>
                    <div className="section">
                        <div className="section-title">Trainer Signature</div>
                        <div className="signature-box">
                            {signature && <img src={signature} className="signature-img" alt="Signature" />}
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
};

export default Template; 