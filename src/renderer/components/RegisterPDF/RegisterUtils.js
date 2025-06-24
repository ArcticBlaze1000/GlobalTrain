// This file will contain utility functions for the Register document,
// such as fetching questions, checking completion status, etc.

export const getRegisterQuestions = () => {
    // In the future, this could fetch from a DB or a config file.
    return [
        { id: 'q1', text: 'Have all trainees signed the register?' },
        { id: 'q2', text: 'Are all sponsor details correct?' },
        { id: 'q3', text: 'Is the trainer signature present?' },
    ];
};

export const checkCompletion = (answers) => {
    // Dummy logic to check if all questions are answered.
    const questions = getRegisterQuestions();
    return questions.every(q => answers[q.id]);
}; 