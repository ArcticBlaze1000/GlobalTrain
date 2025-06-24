import React from 'react';

const ChecklistSection = ({ title, rowCount }) => {
    const rows = Array.from({ length: rowCount });
    return (
        <>
            <tr>
                <th colSpan="3" className="p-2 text-left bg-gray-200 border-b border-black">{title}</th>
            </tr>
            {rows.map((_, index) => (
                <tr key={index} className="divide-x divide-black h-8">
                    <td className="p-2 border-r border-black w-[40%]"></td>
                    <td className="p-2 text-center border-r border-black w-[10%]"></td>
                    <td className="p-2 w-[50%]"></td>
                </tr>
            ))}
        </>
    );
};

const Template = ({ courseTitle, trainerName, courseDate, cssPath }) => {
    return (
        <html>
            <head>
                <link href={cssPath} rel="stylesheet" />
                <style>{'body { -webkit-print-color-adjust: exact; }'}</style>
            </head>
            <body className="p-6 font-sans text-sm">
                <header className="flex justify-between items-center pb-4 border-b">
                    <div className="text-2xl font-bold">
                        <span className="text-red-600">Global</span>
                        <span className="text-blue-600">Train</span>
                    </div>
                    <h1 className="text-2xl font-bold text-center">Training Course Checklist</h1>
                    <div className="w-1/4"></div>
                </header>

                <section className="grid grid-cols-3 gap-4 border p-2 my-4 text-center font-bold">
                    <div>Course: {courseTitle}</div>
                    <div>Trainer: {trainerName}</div>
                    <div>Date: {courseDate}</div>
                </section>

                <main>
                    <table className="w-full border-collapse border border-black">
                        <thead className="bg-gray-100">
                            <tr className="divide-x divide-black font-bold border-b-2 border-black">
                                <th className="p-2 w-[40%] text-left">TOP PACK</th>
                                <th className="p-2 w-[10%]">Indicate</th>
                                <th className="p-2 w-[50%] text-left">Comments</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                            <ChecklistSection title="PRE COURSE CHECKS" rowCount={11} />
                            <ChecklistSection title="LEARNER PACKS" rowCount={8} />
                        </tbody>
                    </table>
                </main>

            </body>
        </html>
    );
};

export default Template; 