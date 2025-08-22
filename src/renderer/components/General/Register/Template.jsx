import React from 'react';

// This component is a template for the PDF. It's not meant to be rendered directly in the app.
// It will be converted to an HTML string and sent to Puppeteer.
const Template = ({ course, trainer, datapack, trainees, competencies, cssPath, logoBase64, responses, successfulTraineesCount }) => {
    // Helper to create empty rows for the table
    const resourcesFit = responses?.resources_fit_for_purpose === 'true' ? 'Yes' : 'No';
    const courseDuration = datapack?.duration || 1; // Default to 1 day if not specified

    // Filter competencies based on what's required for the course.
    // Ensure requiredCompetencyIds is always an array.
    let requiredCompetencyIds = [];
    if (course?.competency_ids) {
        try {
            const parsedIds = JSON.parse(course.competency_ids);
            if (Array.isArray(parsedIds)) {
                requiredCompetencyIds = parsedIds;
            } else {
                // If it's not an array but some other truthy value (e.g., a single number), wrap it in an array.
                requiredCompetencyIds = [parsedIds];
            }
        } catch (e) {
            // If it's not valid JSON, it might be a simple string like "1,2,3".
            // This case is not handled by default, so log an error.
            // For now, we'll fall back to an empty array to prevent a crash.
            console.error("Could not parse course.competency_ids:", course.competency_ids, e);
        }
    }
    const requiredCompetencies = (competencies || []).filter(comp => requiredCompetencyIds.includes(comp.id));

    return (
        <html>
            <head>
                {/* Link to the stylesheet passed as a prop */}
                <link href={cssPath} rel="stylesheet" />
                <style>{`
                    /* A little extra CSS to ensure consistent printing */
                    body { -webkit-print-color-adjust: exact; }
                    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
                `}</style>
            </head>
            <body className="font-sans text-[8px] p-4">
                <div className="p-2">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-xl font-bold">ATTENDANCE REGISTER & ANALYSIS SHEET</h1>
                        {logoBase64 && <img src={logoBase64} alt="Global Train Logo" style={{ width: '100px' }} />}
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
                                    <td className="p-1 font-bold border-r border-black w-2/3 bg-blue-100">RESOURCES FIT FOR PURPOSE:</td>
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
                    <div className="avoid-break">
                        <h2 className="text-base font-bold mt-4 mb-1">Attendance</h2>
                        <table className="w-full border-collapse border border-black">
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
                                            if (typeof signatureOrInitial === 'string' && signatureOrInitial.startsWith('data:image')) {
                                                return (
                                                    <td key={i} className="p-1 h-8 text-center">
                                                        <img src={signatureOrInitial} alt="Signature" style={{ height: '100%', maxHeight: '32px', display: 'block', margin: 'auto' }} />
                                                    </td>
                                                );
                                            }

                                            if (signatureOrInitial === 'absent') {
                                                return <td key={i} className="p-1 h-8 text-center">Absent</td>;
                                            }

                                            if (signatureOrInitial === 'skip') {
                                                return <td key={i} className="p-1 h-8 text-center">Skipped</td>;
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
                    </div>

                    {/* Competencies Section */}
                    <div className="mt-4 avoid-break">
                        <h2 className="text-base font-bold mb-1">Competencies</h2>
                        <table className="w-full border-collapse border border-black">
                            <thead className="border-b border-black">
                                <tr className="divide-x divide-black bg-blue-100">
                                    <th className="p-1">CANDIDATE NAME</th>
                                    {(requiredCompetencies || []).map(comp => (
                                        <th key={comp.id} className="p-1 text-center">{comp.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black">
                                {(trainees || []).map(trainee => (
                                    <tr key={trainee.id} className="divide-x divide-black">
                                        <td className="p-1 h-8">{trainee.forename} {trainee.surname}</td>
                                        {(requiredCompetencies || []).map(comp => {
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

                    <div className="flex justify-between mt-8 text-[8px] pt-4 avoid-break">
                        <div className="w-1/2 pr-4">
                            <h3 className="text-base font-bold mb-1">Trainer Comments</h3>
                            <p className="border p-2 min-h-[60px]">{responses?.trainer_comments || ''}</p>
                            <div className="mt-2">
                                <p className="font-bold mb-1">Trainer Signature:</p>
                                <div className="border h-20 w-full flex items-center justify-center">
                                    {responses?.trainer_signature && <img src={responses.trainer_signature} alt="Trainer Signature" className="h-full w-full object-contain"/>}
                                </div>
                            </div>
                        </div>
                        <div className="w-1/2 pl-4">
                            <h3 className="text-base font-bold mb-1">Admin Comments</h3>
                            <p className="border p-2 min-h-[60px]">{responses?.admin_comments || ''}</p>
                            <div className="mt-2">
                                <p className="font-bold mb-1">Admin Signature:</p>
                                <div className="border h-20 w-full flex items-center justify-center">
                                    {responses?.admin_signature && <img src={responses.admin_signature} alt="Admin Signature" className="h-full w-full object-contain"/>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'fixed', bottom: '20px', width: '100%', textAlign: 'center', fontSize: '10px', fontFamily: 'Arial, sans-serif' }}>
                        GT19 02 V3 August 2025
                    </div>
                </div>
            </body>
        </html>
    );
};

export default Template; 