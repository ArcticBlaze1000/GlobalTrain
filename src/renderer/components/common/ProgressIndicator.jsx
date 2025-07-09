import React from 'react';

const ProgressIndicator = ({ progress }) => {
    if (progress === null || progress === undefined) {
        return <span className="text-red-500 font-bold text-xl">?</span>;
    }
    if (progress === 100) {
        return <span className="text-green-500 text-xl">✔</span>;
    }
    return (
        <span className="text-red-500 font-bold text-sm">
            {progress}%
        </span>
    );
};

export default ProgressIndicator; 