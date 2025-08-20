import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaFileUpload, FaCheckCircle, FaTrashAlt, FaInfoCircle, FaCopy } from 'react-icons/fa';

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
    const { allow_multiple: allowMultiple } = question;
    const [files, setFiles] = useState([]); 
    const [copySuccess, setCopySuccess] = useState('');

    const requiredName = useMemo(() => {
        if (!fileNameHint) return '';
        return fileNameHint.replace('Required name: ', '');
    }, [fileNameHint]);

    useEffect(() => {
        if (!value) {
            setFiles([]);
            return;
        }
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            const initialFiles = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
            // Ensure initial files from DB are marked as 'uploaded'
            setFiles(initialFiles.map(f => ({ name: f.name, url: f.url, status: 'uploaded' })));
        } catch {
            setFiles([]);
        }
    }, [value]);

    const onDrop = useCallback((acceptedFiles, fileRejections) => {
        // Validation for incorrect file types
        if (fileRejections.length > 0) {
            const rejectedFiles = fileRejections.map(rej => rej.file.name).join(', ');
            alert(`File type not accepted for: ${rejectedFiles}`);
            return;
        }

        // Validation for file names
        for (const file of acceptedFiles) {
            const isTraineeSpecific = requiredName.includes('TraineeFirstName_TraineeLastName');
            
            // If it's a trainee-specific file, we skip the rigid name check
            // as the backend will parse the name. We just need to ensure it's not empty.
            if (isTraineeSpecific) {
                continue; 
            }

            if (requiredName) {
                const uploadedFileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
                if (allowMultiple) {
                    const requiredPrefix = requiredName.replace('_Part_X', '').toLowerCase();
                    if (!uploadedFileNameWithoutExt.toLowerCase().startsWith(requiredPrefix)) {
                        alert(`Incorrect file name for "${file.name}".\nPlease name the file starting with: "${requiredName.replace('_Part_X', '')}"`);
                        return; // Stop the process
                    }
                } else {
                    if (uploadedFileNameWithoutExt.toLowerCase() !== requiredName.toLowerCase()) {
                        alert(`Incorrect file name.\nPlease name the file: "${requiredName}"`);
                        return; // Stop the process
                    }
                }
            }
        }

        const readFileAsBase64 = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({
                    name: file.name,
                    data: reader.result.split(',')[1],
                    type: file.type,
                    status: 'staged'
                });
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
        };

        Promise.all(acceptedFiles.map(readFileAsBase64)).then(newFiles => {
            const existingUploaded = files.filter(f => f.status === 'uploaded');
            const updatedFiles = allowMultiple ? [...existingUploaded, ...newFiles] : newFiles;
            setFiles(updatedFiles);
            onChange(updatedFiles);
        });

    }, [allowMultiple, files, onChange, requiredName]);

    const removeFile = (indexToRemove) => {
        const updatedFiles = files.filter((_, index) => index !== indexToRemove);
        setFiles(updatedFiles);
        onChange(updatedFiles.length > 0 ? updatedFiles : null);
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

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, disabled, accept: documentDetails?.type ? fileTypeMap[documentDetails.type] : null });

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 w-full space-y-4">
             {fileNameHint && (
                <div className="flex items-center p-3 rounded-md bg-blue-50 border border-blue-200">
                    <FaInfoCircle className="text-blue-500 mr-3 text-xl flex-shrink-0" />
                    <p className="text-sm text-blue-700 font-mono flex-grow">{fileNameHint}</p>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="ml-4 px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                        title="Copy name hint to clipboard"
                    >
                        <FaCopy className="mr-1" />
                        Copy
                    </button>
                    {copySuccess && <p className="text-xs text-green-600 ml-2">{copySuccess}</p>}
                </div>
            )}
            
            <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}`}>
                <input {...getInputProps()} />
                <FaFileUpload className="mx-auto text-3xl text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                    {isDragActive ? 'Drop here...' : `Drag & drop or click to select`}
                </p>
                {documentDetails?.type && <p className="text-xs text-gray-500 mt-1">Accepted types: {Object.values(fileTypeMap[documentDetails.type] || {}).flat().join(', ')}</p>}
            </div>

            {files.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Selected Files</h4>
                    <ul className="space-y-2">
                        {files.map((file, index) => (
                            <li key={index} className={`flex items-center justify-between p-2 rounded-md border-l-4 ${file.status === 'uploaded' ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500'}`}>
                                <div className="flex items-center space-x-3">
                                    {file.status === 'uploaded' ? <FaCheckCircle className="text-green-600" /> : <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" title="Staged for upload"></div>}
                                    <span className="text-sm text-gray-800 truncate">{file.name}</span>
                                </div>
                                {!disabled && (
                                    <button onClick={() => removeFile(index)} className="text-gray-500 hover:text-red-600">
                                        <FaTrashAlt />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UploadQuestion; 