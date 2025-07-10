import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';

const fileTypeMap = {
    'scanned photo': {
        'image/jpeg': ['.jpeg', '.jpg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
    },
    'scanned pdf': {
        'application/pdf': ['.pdf'],
    },
    'email': {
        'message/rfc822': ['.eml'],
        'application/vnd.ms-outlook': ['.msg'],
    },
};

const UploadQuestion = ({ question, value, onChange, disabled, documentDetails, fileNameHint }) => {
    const [uploadedFile, setUploadedFile] = useState(value ? { name: value } : null);
    const [copySuccess, setCopySuccess] = useState('');

    const acceptOptions = documentDetails?.type ? fileTypeMap[documentDetails.type] : null;

    const requiredName = useMemo(() => {
        if (!fileNameHint) return '';
        return fileNameHint.replace('Required name: ', '').replace('Required name format: ', '');
    }, [fileNameHint]);

    const onDrop = useCallback((acceptedFiles, fileRejections) => {
        if (fileRejections.length > 0) {
            const rejectedFiles = fileRejections.map(rejection => `${rejection.file.name} (${rejection.errors.map(e => e.message).join(', ')})`).join('\n');
            const allowedTypes = acceptOptions ? Object.values(acceptOptions).flat().join(', ') : 'the correct';
            alert(`File upload failed for:\n${rejectedFiles}\n\nPlease upload files of type: ${allowedTypes}.`);
            return;
        }

        const file = acceptedFiles[0];
        if (file) {
            // Check if the file name matches the required name, if a specific name is given
            if (requiredName && !requiredName.includes('{') && !requiredName.includes('}')) {
                const uploadedFileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
                if (uploadedFileNameWithoutExt.toLowerCase() !== requiredName.toLowerCase()) {
                    alert(`Incorrect file name.\n\nPlease name the file: "${requiredName}"`);
                    return; // Stop processing the file if the name doesn't match
                }
            }
            setUploadedFile(file);
            onChange(file.name);
        }
    }, [onChange, acceptOptions, requiredName]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled,
        multiple: false,
        accept: acceptOptions,
    });

    const removeFile = (e) => {
        e.stopPropagation();
        setUploadedFile(null);
        onChange('');
    };

    const handleCopy = () => {
        if (!requiredName) return;
        navigator.clipboard.writeText(requiredName).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Failed to copy!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const allowedFileTypesHint = useMemo(() => {
        if (!acceptOptions) return null;
        return Object.values(acceptOptions).flat().join(', ');
    }, [acceptOptions]);

    return (
        <div className="flex w-full items-start space-x-4">
            <div className="w-1/2">
                {(fileNameHint || allowedFileTypesHint) && (
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4 h-full">
                        {fileNameHint && (
                            <div>
                                <label htmlFor="required-name" className="block text-sm font-medium text-gray-700 mb-1">Required File Name</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        id="required-name"
                                        type="text"
                                        readOnly
                                        value={requiredName}
                                        className="flex-grow p-2 bg-gray-200 border border-gray-300 rounded-md text-sm text-gray-700 font-mono focus:ring-0 focus:border-gray-300"
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="px-3 py-2 bg-blue-500 text-white text-sm font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Copy
                                    </button>
                                </div>
                                {copySuccess && <p className="text-xs text-green-600 mt-1">{copySuccess}</p>}
                            </div>
                        )}
                        {allowedFileTypesHint && (
                            <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Allowed File Types</label>
                                 <p className="text-sm text-gray-600">{allowedFileTypesHint}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="w-1/2">
                <div
                    {...getRootProps()}
                    className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer h-full flex items-center justify-center
                        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}`}
                >
                    <input {...getInputProps()} />
                    {uploadedFile ? (
                        <div className="flex items-center justify-between w-full">
                            <span className="text-gray-700 truncate">{uploadedFile.name}</span>
                            {!disabled && (
                                <button
                                    onClick={removeFile}
                                    className="ml-4 text-red-500 hover:text-red-700 font-semibold"
                                    aria-label="Remove file"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500">
                            {isDragActive ? 'Drop the file here...' : "Upload file here"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UploadQuestion; 