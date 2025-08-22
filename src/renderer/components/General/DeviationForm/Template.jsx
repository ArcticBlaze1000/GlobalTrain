import React from 'react';

const Template = ({
    logo,
    trainerName,
    courseName,
    totalDeviation,
    reason,
    signature,
}) => {
    return (
        <html lang="en">
        <head>
            <meta charSet="UTF-8" />
            <title>Course Hours Deviation Form</title>
            <style>
                {`
                    @page { size: A4; margin: 0; }
                    body { font-family: sans-serif; margin: 1rem; font-size: 12px; }
                    .header { text-align: center; margin-bottom: 2rem; }
                    .header img { max-width: 180px; }
                    .title { font-size: 16px; font-weight: bold; margin-top: 1rem; text-align: center; margin-bottom: 2rem; }
                    .info-grid { display: grid; grid-template-columns: 1fr 3fr; gap: 1rem; margin-bottom: 2rem; }
                    .info-grid > div { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
                    .label { font-weight: bold; }
                    .content { font-family: monospace; }
                    .reason-section { margin-top: 2rem; }
                    .reason-box { border: 1px solid #ccc; border-radius: 4px; padding: 1rem; min-height: 200px; white-space: pre-wrap; }
                    .signature-section { margin-top: 3rem; page-break-inside: avoid; }
                    .sig-img { max-width: 200px; max-height: 80px; border-bottom: 1px solid black; }
                `}
            </style>
        </head>
        <body>
            <div className="header">
                {logo && <img src={logo} alt="Global Train Logo" />}
            </div>
            
            <div className="title">
                COURSE HOURS DEVIATION FORM
            </div>

            <div className="info-grid">
                <div className="label">Trainer Name:</div>
                <div className="content">{trainerName}</div>
                
                <div className="label">Course Name:</div>
                <div className="content">{courseName}</div>

                <div className="label">Total Hours Deviated:</div>
                <div className="content">{totalDeviation}</div>
            </div>

            <div className="reason-section">
                <div className="label">Reason for Deviation:</div>
                <div className="reason-box">{reason}</div>
            </div>

            <div className="signature-section">
                <div className="label">Trainer Signature:</div>
                {signature && <img src={signature} alt="Trainer Signature" className="sig-img" />}
            </div>
             <div style={{ position: 'fixed', bottom: '20px', width: '100%', textAlign: 'center', fontSize: '10px', fontFamily: 'Arial, sans-serif' }}>
                GT22 12 V1 March 2024
            </div>
        </body>
        </html>
    );
};

export default Template; 