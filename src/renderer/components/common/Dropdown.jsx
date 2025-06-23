import React from 'react';

const Dropdown = ({ label, value, onChange, options, placeholder }) => {
    // The 'options' prop should be an array of objects, e.g., [{ id: 1, name: 'Option 1' }]
    // Or if the display name is different, use a 'displayKey' prop. For now, 'name' is assumed.
    
    return (
        <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="" disabled hidden>
                    {placeholder || `Select ${label}...`}
                </option>
                {options.map(option => (
                    <option key={option.id} value={option.id}>{option.name || `${option.forename} ${option.surname}`}</option>
                ))}
            </select>
        </div>
    );
};

export default Dropdown; 