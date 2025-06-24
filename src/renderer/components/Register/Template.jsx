import React from 'react';

// This component is a template for the PDF. It's not meant to be rendered directly in the app.
// It will be converted to an HTML string and sent to Puppeteer.
const Template = ({ course, trainer, datapack, trainees, cssPath, responses }) => {
    // Helper to create empty rows for the table
    const emptyRows = Array.from({ length: Math.max(0, 8 - (trainees?.length || 0)) });
    const resourcesFit = responses?.resources_fit_for_purpose === 'true' ? 'Yes' : 'No';

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
                        <h1 className="text-xl font-bold">ATTENDANCE REGISTER & ANALYSIS SHEET</h1>
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
                                    <td className="p-1"></td>
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
                                {[...Array(5)].map((_, i) => (
                                    <th key={i} className="p-1 text-center">
                                        DAY {i+1}
                                        {i === 0 && <><br/>(SIGNATURE)</>}
                                    </th>
                                ))}
                                <th className="p-1 text-center">LEVEL OF SPOKEN<br/>ENGLISH ADEQUATE</th>
                                <th className="p-1 text-center">PASS OR<br/>FAIL</th>
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
                                    {[...Array(8)].map((_, i) => <td key={i} className="p-1 h-8"></td>)}
                                </tr>
                            ))}
                            {emptyRows.map((_, index) => (
                                <tr key={`empty-${index}`} className="divide-x divide-black">
                                     <td className="p-1 text-center">{(trainees?.length || 0) + index + 1}</td>
                                     {[...Array(11)].map((_, i) => <td key={i} className="p-1 h-8"></td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Footer Section */}
                    <div className="grid grid-cols-2 gap-x-4 mt-2">
                         <div>
                            <div className="border border-black h-24 p-1">
                                <p className="font-bold">ADMIN COMMENTS:</p>
                            </div>
                             <div className="border-x border-b border-black p-1">
                                <p className="font-bold">ADMIN SIGNATURE:</p>
                                <br/><br/>
                            </div>
                        </div>
                        <div>
                            <div className="border border-black h-24 p-1">
                                <p className="font-bold">TRAINER COMMENTS:</p>
                            </div>
                             <div className="border-x border-b border-black p-1">
                                <p className="font-bold">TRAINER SIGNATURE:</p>
                                <br/><br/>
                            </div>
                        </div>
                    </div>
                    <div className="border-x border-b border-black p-1 h-24">
                        <p className="font-bold">Additional notes/hand outs/references etc:</p>
                    </div>

                    {/* Version footer is now empty */}
                </div>
            </body>
        </html>
    );
};

export default Template; 