import React from 'react';

const Template = ({
    courseName,
    trainerName,
    eventDays,
    logoBase64
}) => {
    return (
        <div style={{ fontFamily: 'sans-serif', margin: '20px' }}>
            <header style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
                {logoBase64 && <img src={`data:image/jpeg;base64,${logoBase64}`} alt="Logo" style={{ maxHeight: '80px', marginBottom: '10px' }} />}
                <h1 style={{ margin: '0' }}>Daily Progress Record</h1>
                <h2 style={{ margin: '5px 0 0 0', color: '#555' }}>{courseName}</h2>
            </header>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Day</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Date</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Start Time</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>End Time</th>
                    </tr>
                </thead>
                <tbody>
                    {eventDays.map((date, index) => (
                        <tr key={index}>
                            <td style={{ border: '1px solid #ddd', padding: '10px', height: '50px' }}>{index + 1}</td>
                            <td style={{ border: '1px solid #ddd', padding: '10px' }}>{date.toLocaleDateString('en-GB')}</td>
                            <td style={{ border: '1px solid #ddd', padding: '10px' }}></td>
                            <td style={{ border: '1px solid #ddd', padding: '10px' }}></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', fontSize: '12px' }}>
                <p><strong>Lead Trainer:</strong> {trainerName}</p>
            </footer>
        </div>
    );
};

export default Template; 