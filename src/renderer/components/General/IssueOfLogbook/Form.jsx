import React from 'react';

const Form = ({ documentDetails }) => {
    return (
        <div className="p-4 border rounded-lg bg-gray-50">
            <h2 className="text-lg font-semibold mb-4">{documentDetails.name}</h2>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
                <p className="text-gray-500">File upload functionality will be here.</p>
            </div>
        </div>
    );
};

export default Form; 