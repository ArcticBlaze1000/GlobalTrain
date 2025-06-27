import React from 'react';

const Template = ({ responses = {}, logo }) => {
    
    const SELECTION_COLOR = '#e0f2fe'; // A light blue color

    const renderMultiChoice = (options, responseKey, chunkSize = 5) => {
        const selectedValue = responses[responseKey]?.data;
        
        const chunkedOptions = [];
        for (let i = 0; i < options.length; i += chunkSize) {
            chunkedOptions.push(options.slice(i, i + chunkSize));
        }

        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                <tbody>
                    {chunkedOptions.map((chunk, index) => (
                        <tr key={index}>
                            {chunk.map(opt => (
                                <td key={opt} style={{ ...styles.td, backgroundColor: selectedValue === opt ? SELECTION_COLOR : 'white' }}>
                                    {opt}
                                </td>
                            ))}
                            {/* Fill remaining cells if chunk is smaller than chunkSize */}
                            {chunk.length < chunkSize && Array.from({ length: chunkSize - chunk.length }).map((_, i) => <td key={`fill-${i}`} style={{...styles.td, border: '1px solid #ccc'}}></td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const renderYesNo = (responseKey, detailsKey) => {
        const selectedValue = responses[responseKey]?.data;
        const details = responses[detailsKey]?.data || '';
        return (
            <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...styles.td, width: '50px', backgroundColor: selectedValue === 'Yes' ? SELECTION_COLOR : 'white' }}>Yes</td>
                            <td style={{ ...styles.td, width: '50px', backgroundColor: selectedValue === 'No' ? SELECTION_COLOR : 'white' }}>No</td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ marginTop: '5px', border: '1px solid black', padding: '8px', minHeight: '30px' }}>
                    <strong>If yes please provide details:</strong> {details}
                </div>
            </div>
        );
    };

    const renderScore = () => {
        const score = responses['pre_self_assessment_score']?.data;
        return (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{...styles.th, width: '100px'}}>Score</th>
                        {[1, 2, 3, 4, 5].map(s => <th key={s} style={styles.th}>{s}</th>)}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={styles.td}></td>
                        {[1, 2, 3, 4, 5].map(s => (
                            <td key={s} style={{...styles.td, backgroundColor: String(score) === String(s) ? SELECTION_COLOR : 'white' }}></td>
                        ))}
                    </tr>
                    <tr>
                        <td colSpan="6" style={{...styles.td, fontSize: '10px'}}>
                            On a scale of 1 being low confidence and understanding and 5 the highest. Please indicate your level above
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }
    
    const styles = {
        body: { fontFamily: 'sans-serif', margin: '0', padding: '2rem', fontSize: '10px' },
        logoContainer: { textAlign: 'center', marginBottom: '1.5rem' },
        logo: { maxWidth: '150px' },
        h1: { textAlign: 'center', fontWeight: 'bold', fontSize: '20px', marginBottom: '1.5rem', textDecoration: 'underline' },
        p: { marginBottom: '1rem', lineHeight: '1.4' },
        table: { width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '10px' },
        th: { border: '1px solid black', padding: '6px', textAlign: 'left', fontWeight: 'bold' },
        td: { border: '1px solid black', padding: '6px' },
        supportQuestionText: { border: '1px solid black', padding: '6px', fontSize: '12px' },
        sectionTitle: { fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '11px' }
    };

    return (
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <title>Pre-course Questionnaire</title>
        </head>
        <body style={styles.body}>
            <div style={styles.logoContainer}>
                {logo && <img src={logo} alt="Global Train Logo" style={styles.logo} />}
            </div>

            <h1 style={styles.h1}>Pre course</h1>
            <p style={styles.p}>
                Global Train Ltd operates a policy of equal opportunity and fair treatment for all persons attending Training and Development Courses.
            </p>
            <p style={styles.p}>
                To assist in monitoring this policy would you please indicate your status below, by ticking a box.
            </p>
            <p style={styles.p}>
                Your answers will be treated confidentially. The information will be used for Global Train purposes only and will be always held securely and not be divulged to any other persons or companies.
            </p>

            <table style={styles.table}>
                <tbody>
                    <tr><td style={styles.td}><strong>Gender</strong></td><td style={styles.td}>{renderMultiChoice(['Male', 'Female', 'Other', 'Prefer Not To Say'], 'pre_gender', 4)}</td></tr>
                    <tr><td style={styles.td}><strong>Age</strong></td><td style={styles.td}>{renderMultiChoice(['16-24', '25-39', '40+', 'Prefer Not To Say'], 'pre_age', 4)}</td></tr>
                    <tr><td style={styles.td}><strong>Nationality</strong></td><td style={styles.td}>{renderMultiChoice(['English', 'British', 'Scottish', 'Welsh', 'Northern Irish', 'European', 'Other', 'Prefer Not Say'], 'pre_nationality', 4)}</td></tr>
                    <tr><td style={styles.td}><strong>Ethnicity</strong></td><td style={styles.td}>
                        {renderMultiChoice(['White', 'Black', 'Mixed Race', 'Asian', 'African', 'Gypsy/Traveller', 'Indian', 'Pakistani', 'Bangladeshi', 'Chinese', 'Other', 'Prefer Not To Say'], 'pre_ethnicity', 4)}
                    </td></tr>
                </tbody>
            </table>

            <div style={{...styles.sectionTitle, marginBottom: '1rem'}}>Please answer the following:</div>
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={{...styles.supportQuestionText, width: '70%'}}>Do you have any disabilities or health issues that you would like to make us aware of?</td>
                        <td style={styles.td}>{renderYesNo('pre_disabilities_q', 'pre_disabilities_details')}</td>
                    </tr>
                    <tr>
                        <td style={{...styles.supportQuestionText, width: '70%'}}>Do you have any learning difficulties you would like to make us aware of?</td>
                        <td style={styles.td}>{renderYesNo('pre_learning_difficulties_q', 'pre_learning_difficulties_details')}</td>
                    </tr>
                </tbody>
            </table>

            <div style={{...styles.sectionTitle, marginTop: '2rem'}}>Self-Assessment</div>
            <p style={styles.p}>
                Global Train want to ensure that all our training and assessment events provide a positive learning experience for our learners. We want you to recognise the progress you make in relation to your starting point.
            </p>
            <div style={{...styles.sectionTitle, marginBottom: '1rem'}}>Please consider the level of confidence and understanding you have in relation to the course you are about to undertake. We will revisit this at the end of the course:</div>
            
            {renderScore()}

        </body>
        </html>
    );
};

export default Template; 