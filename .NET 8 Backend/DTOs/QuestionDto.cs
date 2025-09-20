public record QuestionDto(
    int Order,
    string Text,
    string AudioUrl,
    Difficulty Difficulty,
    int TotalQuestions,
    bool IsLast
);