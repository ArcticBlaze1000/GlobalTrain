import React from 'react';

const FileCheckDisplay = ({ fileStatus, onRefresh }) => {
    if (!fileStatus) {
        return (
            <div className="flex-grow flex items-center justify-center p-6 text-gray-500">
                Loading file status...
            </div>
        );
    }

    const {
        exists,
        expectedPath,
        expectedFilename,
        allowedTypes,
        foundFile
    } = fileStatus;

    return (
        <div className="flex-grow p-8 bg-white rounded-lg shadow-md m-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Document Upload Status</h3>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 4L15 9M4 20l5-5"></path></svg>
                        Refresh
                    </button>
                )}
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center">
                    <span className="text-lg font-semibold w-32">Status:</span>
                    {exists ? (
                        <span className="text-lg text-green-600 font-bold flex items-center">
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            File Found
                        </span>
                    ) : (
                        <span className="text-lg text-red-600 font-bold flex items-center">
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            File Not Found
                        </span>
                    )}
                </div>

                {exists && foundFile && (
                     <div className="pl-4">
                        <p className="text-sm text-gray-800"><span className="font-semibold">Detected File:</span> {foundFile}</p>
                    </div>
                )}
                
                <div className="pt-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Upload Instructions</h4>
                    <div className="p-4 border rounded-md bg-gray-50 space-y-2 text-sm">
                        <p>Please save the required file to the following location:</p>
                        <code className="block bg-gray-200 p-2 rounded text-gray-700 break-words">{expectedPath}</code>
                        <p>The file must be named exactly:</p>
                        <code className="block bg-gray-200 p-2 rounded text-gray-700">{expectedFilename}</code>
                        <p>Allowed file types:</p>
                        <code className="block bg-gray-200 p-2 rounded text-gray-700">
                            {allowedTypes ? allowedTypes.join(', ') : 'N/A'}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileCheckDisplay; 