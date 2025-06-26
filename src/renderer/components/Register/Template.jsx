import React from 'react';

// This component is a template for the PDF. It's not meant to be rendered directly in the app.
// It will be converted to an HTML string and sent to Puppeteer.
const Template = ({ course, trainer, datapack, trainees, competencies, cssPath, responses, successfulTraineesCount }) => {
    // Helper to create empty rows for the table
    const resourcesFit = responses?.resources_fit_for_purpose === 'true' ? 'Yes' : 'No';
    const courseDuration = datapack?.duration || 1; // Default to 1 day if not specified

    return (
        <html>
            <head>
                {/* Link to the stylesheet passed as a prop */}
                <link href={cssPath} rel="stylesheet" />
                <style>{`
                    /* A little extra CSS to ensure consistent printing */
                    body { -webkit-print-color-adjust: exact; }
                `}</style>
            </head>
            <body className="font-sans text-[10px] p-4">
                <div className="p-2">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-xl font-bold">ATTENDANCE REGISTER & ANALYSIS SHEET (V2 - TEST)</h1>
                        <div className="text-2xl font-bold">
                            <span className="text-red-600">Global</span>
                            <span className="text-blue-600">Train</span>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-x-4">
                        <table className="border-collapse border border-black w-full">
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="p-1 font-bold border-r border-black w-1/3 bg-blue-100">COURSE TITLE:</td>
                                    <td className="p-1">{course?.name}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-1 font-bold border-r border-black w-1/3 bg-blue-100">COURSE DATES:</td>
                                    <td className="p-1">{new Date(datapack?.start_date).toLocaleDateString('en-GB')}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-1 font-bold border-r border-black w-1/3 bg-blue-100">TRAINER:</td>
                                    <td className="p-1">{trainer?.forename} {trainer?.surname}</td>
                                </tr>
                                <tr>
                                    <td className="p-1 font-bold border-r border-black w-1/3 bg-blue-100">NWR Toolkit No:</td>
                                    <td className="p-1">{responses?.nwr_toolkit_no || ''}</td>
                                </tr>
                            </tbody>
                        </table>
                        <table className="border-collapse border border-black w-full">
                             <tbody>
                                <tr className="border-b border-black">
                                    <td className="p-1 font-bold border-r border-black w-2/3 bg-blue-100">TOTAL TRAINEES ATTENDED:</td>
                                    <td className="p-1">{datapack?.total_trainee_count}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-1 font-bold border-r border-black w-2/3 bg-blue-100">TOTAL TRAINEES SUCCESSFUL:</td>
                                    <td className="p-1">{successfulTraineesCount}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-1 font-bold border-r border-black w-2/3 bg-blue-100">RESOURCES FIT FOR PURPOSE*:</td>
                                    <td className="p-1">{resourcesFit}</td>
                                </tr>
                                <tr>
                                    <td className="p-1 font-bold border-r border-black w-2/3 bg-blue-100">RESOURCES:</td>
                                    <td className="p-1">{responses?.resources || ''}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Main Table */}
                    <table className="w-full mt-2 border-collapse border border-black text-[8px]">
                        <thead className="border-b border-black">
                            <tr className="divide-x divide-black bg-blue-100">
                                <th className="p-1">NO.</th>
                                <th className="p-1">CANDIDATE NAME</th>
                                <th className="p-1">SENTINEL NO.</th>
                                <th className="p-1">SPONSOR</th>
                                {[...Array(courseDuration)].map((_, i) => (
                                    <th key={i} className="p-1 text-center">
                                        DAY {i+1}
                                        {i === 0 && <><br/>(SIGNATURE)</>}
                                    </th>
                                ))}
                                <th className="p-1 text-center">LEVEL OF SPOKEN<br/>ENGLISH ADEQUATE</th>
                                <th className="p-1 text-center">FINAL RESULT</th>
                                <th className="p-1 text-center">SENTINEL NOTIFIED<br/>(DATE)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                            {(trainees || []).map((trainee, index) => (
                                <tr key={trainee.id} className="divide-x divide-black">
                                    <td className="p-1 text-center">{index + 1}</td>
                                    <td className="p-1 h-8">{trainee.forename} {trainee.surname}</td>
                                    <td className="p-1 h-8">{trainee.sentry_number}</td>
                                    <td className="p-1 h-8">{trainee.sponsor}</td>
                                    {[...Array(courseDuration)].map((_, i) => {
                                        const dayFieldName = `day_${i + 1}_attendance`;
                                        const dayResponse = responses[dayFieldName];
                                        let attendanceData = {};
                                        if (dayResponse) {
                                            try {
                                                attendanceData = JSON.parse(dayResponse);
                                            } catch (e) {
                                                console.error("Could not parse attendance JSON for PDF:", e);
                                            }
                                        }
                                        const signatureOrInitial = attendanceData[trainee.id] || '';

                                        // Day 1 is a signature image, other days are initials
                                        if (i === 0 && signatureOrInitial) {
                                            return (
                                                <td key={i} className="p-1 h-8 text-center">
                                                    <img src={signatureOrInitial} alt="Signature" style={{ height: '100%', maxHeight: '32px', display: 'block', margin: 'auto' }} />
                                                </td>
                                            );
                                        }

                                        return <td key={i} className="p-1 h-8 text-center text-[7px]">{signatureOrInitial}</td>;
                                    })}
                                    <td className="p-1 h-8 text-center">
                                        {(() => {
                                            const response = responses?.level_of_spoken_english_adequate;
                                            if (response) {
                                                try {
                                                    const data = JSON.parse(response);
                                                    return data[trainee.id] || '';
                                                } catch (e) { return ''; }
                                            }
                                            return '';
                                        })()}
                                    </td>
                                    <td className="p-1 h-8 text-center">
                                        {(() => {
                                            const response = responses?.final_result;
                                            if (response) {
                                                try {
                                                    const data = JSON.parse(response);
                                                    return data[trainee.id] || '';
                                                } catch (e) { return ''; }
                                            }
                                            return '';
                                        })()}
                                    </td>
                                    <td className="p-1 h-8 text-center">
                                        {(() => {
                                            const response = responses?.sentinel_notified_date;
                                            if (response) {
                                                try {
                                                    const data = JSON.parse(response);
                                                    const date = data[trainee.id];
                                                    return date ? new Date(date).toLocaleDateString('en-GB') : '';
                                                } catch (e) { return ''; }
                                            }
                                            return '';
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Competencies Section */}
                    <div className="mt-4">
                        <h2 className="text-lg font-bold mb-1">Competencies</h2>
                        <table className="w-full border-collapse border border-black text-[8px]">
                            <thead className="border-b border-black">
                                <tr className="divide-x divide-black bg-blue-100">
                                    <th className="p-1">CANDIDATE NAME</th>
                                    {(competencies || []).map(comp => (
                                        <th key={comp.id} className="p-1 text-center">{comp.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black">
                                {(trainees || []).map(trainee => (
                                    <tr key={trainee.id} className="divide-x divide-black">
                                        <td className="p-1 h-8">{trainee.forename} {trainee.surname}</td>
                                        {(competencies || []).map(comp => {
                                            const field_name = `competency_${comp.name.toLowerCase().replace(/\s/g, '_')}`;
                                            const response = responses[field_name];
                                            let competencyValue = '';
                                            if (response) {
                                                try {
                                                    const competencyData = JSON.parse(response);
                                                    competencyValue = competencyData[trainee.id] || '';
                                                } catch (e) {
                                                    console.error(`Could not parse competency JSON for ${field_name}:`, e);
                                                }
                                            }
                                            return <td key={comp.id} className="p-1 h-8 text-center">{competencyValue}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Version footer is now empty */}
                </div>
            </body>
        </html>
    );
};

export default Template; 