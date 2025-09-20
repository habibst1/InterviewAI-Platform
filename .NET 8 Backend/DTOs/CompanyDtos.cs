public record CreateCompanyInterviewRequest(
    string Title,
    List<CompanyQuestionDto> Questions,
    Dictionary<Difficulty, int> QuestionsPerTier,
    List<string> CandidateEmails);

public record CompanyQuestionDto(
    string Text,
    string IdealAnswer,
    Difficulty Difficulty);

public record CompanyInterviewResultDto(
    Guid SessionId,
    string CandidateEmail,
    bool IsCompleted,
    double? AverageScore,
    int ResponseCount
);

public record CompanyResponseDto(
    int Order,
    string QuestionText,
    string? UserAudioTranscribed,
    string? Feedback,
    int? Score);