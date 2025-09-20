public record InterviewStartResponse(
    Guid SessionId,
    QuestionDto FirstQuestion,
    int TotalQuestions);