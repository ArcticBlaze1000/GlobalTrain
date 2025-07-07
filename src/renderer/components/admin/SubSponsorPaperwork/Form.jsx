import React, { useState, useEffect, useCallback } from 'react';
import FileCheckDisplay from '../Common/FileCheckDisplay';

const Form = ({ eventDetails, documentDetails, traineeDetails }) => {
    const [fileCheckStatus, setFileCheckStatus] = useState(null);

    const checkFile = useCallback(async () => {
        if (eventDetails && documentDetails) {
            setFileCheckStatus(null);
            const status = await window.electron.checkDocumentFile({
                datapackId: eventDetails.id,
                documentName: documentDetails.name,
            });
            setFileCheckStatus(status);
        }
    }, [eventDetails, documentDetails]);

    useEffect(() => {
        checkFile();
    }, [checkFile]);

    return (
        <div className="p-4 space-y-4">
            <FileCheckDisplay fileStatus={fileCheckStatus} onRefresh={checkFile} />
        </div>
    );
};

export default Form; 