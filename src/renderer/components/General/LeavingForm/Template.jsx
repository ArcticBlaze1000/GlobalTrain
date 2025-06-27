import React from 'react';

const Template = ({ logoBase64, reasons, candidateSignature, trainerName, trainerSignature, date }) => {
    return (
        <html>
            <head>
                <style>{`
                    body { font-family: sans-serif; margin: 2rem; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 1rem; }
                    .logo { width: 150px; }
                    .title { font-size: 1.5rem; font-weight: bold; }
                    .content { margin-top: 2rem; }
                    .section { margin-bottom: 2rem; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
                    .label { font-weight: bold; margin-bottom: 0.5rem; }
                    .textbox { border: 1px solid #ccc; padding: 1rem; min-height: 150px; border-radius: 5px; }
                    .disclaimer { background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 1rem; border-radius: 5px; font-style: italic; }
                    .signature-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4rem; }
                    .signature-box { border: 1px solid #ccc; height: 100px; width: 100%; padding: 0.5rem; }
                    .signature-box img { width: 100%; height: 100%; object-fit: contain; }
                    .signature-details { width: 45%; }
                    .line { border-bottom: 1px solid #000; margin-top: 1rem; }
                `}</style>
            </head>
            <body>
                <div className="header">
                    <h1 className="title">Candidate Leaving Early</h1>
                    {logoBase64 && <img src={logoBase64} alt="Logo" className="logo" />}
                </div>

                <div className="content">
                    <div className="info-grid">
                        <div>
                            <p className="label">Trainer Name:</p>
                            <p>{trainerName}</p>
                        </div>
                         <div>
                            <p className="label">Date:</p>
                            <p>{date ? new Date(date).toLocaleDateString('en-GB') : ''}</p>
                        </div>
                    </div>

                    <div className="section">
                        <p className="label">Reasons</p>
                        <div className="textbox">{reasons}</div>
                    </div>

                    <div className="section">
                        <div className="disclaimer">
                            I understand that leaving this course now means I will not be able to continue with the following days of this course.
                        </div>
                    </div>

                    <div className="signature-section">
                        <div className="signature-details">
                            <p className="label">Candidate Signature</p>
                            <div className="signature-box">
                                {candidateSignature && <img src={candidateSignature} alt="Candidate Signature" />}
                            </div>
                        </div>
                        <div className="signature-details">
                            <p className="label">Trainer Signature</p>
                            <div className="signature-box">
                                {trainerSignature && <img src={trainerSignature} alt="Trainer Signature" />}
                            </div>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
};

export default Template; 