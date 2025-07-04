import React, { useState, useEffect } from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import { generateDeviationFormPdf } from './PDFGenerator';

const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

const formatDeviation = (totalMinutes) => {
    if (totalMinutes === 0) return "0h 0m";
    const sign = totalMinutes > 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(totalMinutes) / 60);
    const mins = Math.abs(totalMinutes) % 60;
    return `${sign}${hours}h ${mins}m`;
};

const Form = (props) => {
    const [totalDeviation, setTotalDeviation] = useState('Calculating...');

    useEffect(() => {
        const calculateTotalDeviation = async () => {
            // Progress Record has document_id = 9
            const progressRecordResponses = await window.db.query(
                'SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = 9',
                [props.eventDetails.id]
            );

            let totalMinutes = 0;
            const dailyTimes = {};

            for (const res of progressRecordResponses) {
                const match = res.field_name.match(/^day_(\d+)_(start|finish)_time$/);
                if (match) {
                    const day = match[1];
                    const type = match[2];
                    if (!dailyTimes[day]) dailyTimes[day] = {};
                    dailyTimes[day][type] = res.response_data;
                }
            }

            for (const day in dailyTimes) {
                const start = parseTime(dailyTimes[day].start);
                const finish = parseTime(dailyTimes[day].finish);
                if (start !== null && finish !== null && finish >= start) {
                    // Standard duration is 6 hours (360 minutes)
                    const deviation = (finish - start) - 360;
                    totalMinutes += deviation;
                }
            }
            
            setTotalDeviation(formatDeviation(totalMinutes));
        };

        calculateTotalDeviation();
    }, [props.eventDetails.id]);

    const handleGeneratePdf = async () => {
        // Fetch the latest responses for the deviation form (document_id = 10)
        const currentResponses = await window.db.query(
            'SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = 10',
            [props.eventDetails.id]
        );
        
        const responsesMap = currentResponses.reduce((acc, res) => {
            acc[res.field_name] = res.response_data;
            return acc;
        }, {});

        const formData = {
            trainerName: `${props.user.forename} ${props.user.surname}`,
            courseName: props.eventDetails.courseName,
            totalDeviation: totalDeviation,
            reason: responsesMap.deviation_reason || 'No reason provided.',
            signature: responsesMap.deviation_trainer_signature || null,
            eventDetails: props.eventDetails,
            documentDetails: props.documentDetails
        };
        
        await generateDeviationFormPdf(formData);
    };

    return (
        <div>
            <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
                <h3 className="text-lg font-bold">Deviation Summary</h3>
                <p><strong>Total Calculated Deviation:</strong> {totalDeviation}</p>
            </div>
            <QuestionnaireForm
                {...props}
                pdfButtonText="Save Deviation Form PDF"
                onPdfButtonClick={handleGeneratePdf}
            />
        </div>
    );
};

export default Form; 