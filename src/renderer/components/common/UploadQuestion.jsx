import React, { useState, useCallback } from 'react';
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

const UploadQuestion = ({ question, value, onChange, disabled, documentDetails }) => {
    const [uploadedFile, setUploadedFile] = useState(value ? { name: value } : null);

    const acceptOptions = documentDetails?.type ? fileTypeMap[documentDetails.type] : null;

    const onDrop = useCallback((acceptedFiles, fileRejections) => {
        if (fileRejections.length > 0) {
            const rejectedFiles = fileRejections.map(rejection => `${rejection.file.name} (${rejection.errors.map(e => e.message).join(', ')})`).join('\n');
            const allowedTypes = acceptOptions ? Object.values(acceptOptions).flat().join(', ') : 'the correct';
            alert(`File upload failed for:\n${rejectedFiles}\n\nPlease upload files of type: ${allowedTypes}.`);
            return;
        }

        const file = acceptedFiles[0];
        if (file) {
            setUploadedFile(file);
            onChange(file.name);
        }
    }, [onChange, acceptOptions]);

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

    return (
        <div className="flex items-center space-x-4">
            <div
                {...getRootProps()}
                className={`w-full p-4 border-2 border-dashed rounded-md text-center cursor-pointer
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}`}
            >
                <input {...getInputProps()} />
                {uploadedFile ? (
                    <div className="flex items-center justify-between">
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
    );
};

export default UploadQuestion; 