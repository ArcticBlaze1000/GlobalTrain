import React, { useState, useCallback, useMemo, useEffect } from 'react';
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

const UploadQuestion = ({ question, value, onChange, disabled, documentDetails, fileNameHint, eventDetails, selectedTrainee }) => {
    const { allow_multiple: allowMultiple } = question;
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [copySuccess, setCopySuccess] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!value) {
            setUploadedFiles([]);
            return;
        }

        let filesArray = [];
        if (allowMultiple) {
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                filesArray = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error("Failed to parse multiple files value:", e);
                filesArray = [];
            }
        } else {
            if (typeof value === 'string' && value) {
                filesArray = [{ name: value.split(/[\\/]/).pop(), path: value }];
            } else if (value && value.name) {
                filesArray = [value];
            }
        }
        setUploadedFiles(filesArray.filter(f => f && f.name));
    }, [value, allowMultiple]);

    const acceptOptions = documentDetails?.type ? fileTypeMap[documentDetails.type] : null;

    const requiredName = useMemo(() => {
        if (!fileNameHint) return '';
        return fileNameHint.replace('Required name: ', '').replace('Required name format: ', '');
    }, [fileNameHint]);

    const onDrop = useCallback(async (acceptedFiles, fileRejections) => {
        if (fileRejections.length > 0) {
            const rejectedFiles = fileRejections.map(rejection => `${rejection.file.name} (${rejection.errors.map(e => e.message).join(', ')})`).join('\n');
            const allowedTypes = acceptOptions ? Object.values(acceptOptions).flat().join(', ') : 'the correct';
            alert(`File upload failed for:\n${rejectedFiles}\n\nPlease upload files of type: ${allowedTypes}.`);
            return;
        }

        setIsProcessing(true);

        const processFile = (file) => {
            return new Promise((resolve, reject) => {
                if (requiredName && !requiredName.includes('{') && !requiredName.includes('}')) {
                    const uploadedFileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
                    if (allowMultiple) {
                        const requiredPrefix = requiredName.replace('_Part_X', '_Part').toLowerCase();
                        if (!uploadedFileNameWithoutExt.toLowerCase().startsWith(requiredPrefix)) {
                            alert(`Incorrect file name.\n\nPlease name the file like: "${requiredName.replace('_Part_X', '_Part_1')}"`);
                            return reject('Incorrect file name.');
                        }
                    } else {
                        if (uploadedFileNameWithoutExt.toLowerCase() !== requiredName.toLowerCase()) {
                            alert(`Incorrect file name.\n\nPlease name the file: "${requiredName}"`);
                            return reject('Incorrect file name.');
                        }
                    }
                }

                const reader = new FileReader();
                reader.onload = () => {
                    const fileData = reader.result.split(',')[1]; // Get base64 part
                    resolve({ name: file.name, data: fileData, type: file.type });
                };
                reader.onerror = (error) => {
                    console.error('Error reading file:', error);
                    reject(error);
                };
                reader.readAsDataURL(file);
            });
        };
        
        try {
            const processedFiles = await Promise.all(acceptedFiles.map(processFile));

            if (allowMultiple) {
                const updatedFiles = [...uploadedFiles, ...processedFiles];
                setUploadedFiles(updatedFiles);
                onChange(updatedFiles);
            } else {
                const singleFile = processedFiles[0];
                if (singleFile) {
                    setUploadedFiles([singleFile]);
                    onChange(singleFile);
                }
            }
        } catch (error) {
            if (error !== 'Incorrect file name.') {
                alert('Error processing files.');
            }
        } finally {
            setIsProcessing(false);
        }
    }, [allowMultiple, onChange, uploadedFiles, requiredName]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled,
        multiple: allowMultiple,
        accept: acceptOptions,
    });

    const removeFile = (e, fileToRemove) => {
        e.stopPropagation();
        const newFiles = uploadedFiles.filter(file => (file.name !== fileToRemove.name));
        setUploadedFiles(newFiles);

        if (allowMultiple) {
            onChange(newFiles);
        } else {
            onChange(null);
        }
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
                    className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer h-full flex flex-col items-center justify-center
                        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                        ${disabled || isProcessing ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}`}
                >
                    <input {...getInputProps()} />
                    {isProcessing ? (
                        <p className="text-gray-500">Processing...</p>
                    ) : uploadedFiles.length > 0 ? (
                        <div className="w-full">
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between w-full py-1">
                                    <span className="text-gray-700 truncate text-sm">{file.name}</span>
                                    {!disabled && (
                                        <button
                                            onClick={(e) => removeFile(e, file)}
                                            className="ml-2 text-red-500 hover:text-red-700 font-semibold text-xs"
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">
                            {isDragActive ? 'Drop the file here...' : `Upload file${allowMultiple ? 's' : ''} here`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UploadQuestion; 