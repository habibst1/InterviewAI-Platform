public record SubmitResponseDto(
    Guid SessionId,
    int QuestionOrder,
    IFormFile AudioResponse
);