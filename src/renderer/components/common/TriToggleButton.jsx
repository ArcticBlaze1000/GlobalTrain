import React from 'react';

const TriToggleButton = ({ value, onChange, disabled = false }) => {
    const handleClick = () => {
        if (disabled) return;
        const nextValue = {
            'neutral': 'yes',
            'yes': 'no',
            'no': 'neutral'
        }[value] || 'neutral';
        onChange(nextValue);
    };

    const renderState = () => {
        switch (value) {
            case 'yes':
                return <span className="text-green-500 font-bold">✓</span>;
            case 'no':
                return <span className="text-red-500 font-bold">✗</span>;
            default: // neutral
                return <span className="text-gray-400 font-bold">-</span>;
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`w-8 h-8 flex items-center justify-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={disabled}
        >
            {renderState()}
        </button>
    );
};

export default TriToggleButton; 