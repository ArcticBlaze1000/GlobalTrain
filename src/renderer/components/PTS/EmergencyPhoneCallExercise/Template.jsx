import React from 'react';

const Template = ({ trainee, responses }) => {
    return (
        <html>
            <head>
                <style>{`
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { font-size: 24px; text-align: center; }
                    p { font-size: 16px; }
                `}</style>
            </head>
            <body>
                <h1>Emergency Phone Call Exercise</h1>
                <p><strong>Trainee:</strong> {trainee?.forename} {trainee?.surname}</p>
                <p>This is a placeholder for the emergency phone call exercise content.</p>
                {/* Future content will go here */}
            </body>
        </html>
    );
};

export default Template;
