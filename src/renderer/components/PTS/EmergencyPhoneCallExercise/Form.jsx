import React, { useState, useEffect, useCallback } from 'react';
import FileCheckDisplay from '../../common/FileCheckDisplay';

const Form = ({ eventDetails, documentDetails, traineeDetails }) => {
    const [fileCheckStatus, setFileCheckStatus] = useState(null);

    const checkFile = useCallback(async () => {
        if (eventDetails && documentDetails && traineeDetails) {
            setFileCheckStatus(null);
            const status = await window.electron.checkDocumentFile({
                datapackId: eventDetails.id,
                documentName: documentDetails.name,
                traineeDetails: traineeDetails
            });
            setFileCheckStatus(status);
        }
    }, [eventDetails, documentDetails, traineeDetails]);

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
