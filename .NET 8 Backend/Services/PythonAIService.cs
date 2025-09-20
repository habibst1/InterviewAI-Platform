public interface IPythonAIService
{
    Task<string> GenerateQuestionAudio(string questionText);
    Task<EvaluationResult> EvaluateResponse(Guid questionId, string questionText, string idealAnswer, string audioUrl);
}

public class PythonAIService : IPythonAIService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PythonAIService> _logger;

    public PythonAIService(HttpClient httpClient, ILogger<PythonAIService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<string> GenerateQuestionAudio(string questionText)
    {
        _logger.LogDebug("Starting TTS generation for question text (length: {Length} chars)",
            questionText.Length);

        try
        {
            var requestData = new { text = questionText };
            _logger.LogTrace("Sending TTS request with text: {Text}", questionText);

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var response = await _httpClient.PostAsJsonAsync("/tts", requestData);
            stopwatch.Stop();

            _logger.LogDebug("TTS request completed in {ElapsedMilliseconds}ms with status: {StatusCode}",
                stopwatch.ElapsedMilliseconds, response.StatusCode);

            response.EnsureSuccessStatusCode();

            var audioUrl = await response.Content.ReadFromJsonAsync<string>();
            if (string.IsNullOrWhiteSpace(audioUrl))
            {
                _logger.LogError("Received empty audio URL from TTS service");
                throw new Exception("Invalid TTS response: empty audio URL");
            }

            _logger.LogInformation("Successfully generated TTS audio at {AudioUrl}", audioUrl);
            return audioUrl;
        }
        catch (HttpRequestException httpEx)
        {
            _logger.LogError(httpEx, "HTTP error while generating TTS audio. StatusCode: {StatusCode}",
                httpEx.StatusCode);
            throw new Exception("TTS service unavailable", httpEx);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating TTS audio");
            throw new Exception("TTS generation failed", ex);
        }
    }

    public async Task<EvaluationResult> EvaluateResponse(
        Guid questionId,
        string questionText,
        string idealAnswer,
        string audioUrl)
    {
        _logger.LogInformation("Evaluating response for question {QuestionId}", questionId);
        _logger.LogDebug("Evaluation parameters - Question length: {QLength}, Ideal answer length: {ALength}, Audio URL: {AudioUrl}",
            questionText.Length, idealAnswer.Length, audioUrl);

        try
        {
            var requestData = new
            {
                question_id = questionId,
                question_text = questionText,
                ideal_answer = idealAnswer,
                audio_url = audioUrl
            };

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var response = await _httpClient.PostAsJsonAsync("/evaluate", requestData);
            stopwatch.Stop();

            _logger.LogDebug("Evaluation request completed in {ElapsedMilliseconds}ms with status: {StatusCode}",
                stopwatch.ElapsedMilliseconds, response.StatusCode);

            response.EnsureSuccessStatusCode();

            var evaluationResult = await response.Content.ReadFromJsonAsync<EvaluationResult>();
            if (evaluationResult == null)
            {
                _logger.LogError("Received null evaluation result");
                throw new Exception("Invalid evaluation response: null result");
            }

            _logger.LogInformation("Successfully evaluated question {QuestionId}. Score: {Score}",
                questionId, evaluationResult.Score);
            _logger.LogDebug("Evaluation feedback: {Feedback}", evaluationResult.Feedback);

            return evaluationResult;
        }
        catch (HttpRequestException httpEx)
        {
            _logger.LogError(httpEx, "HTTP error while evaluating response. StatusCode: {StatusCode}",
                httpEx.StatusCode);
            throw new Exception("Evaluation service unavailable", httpEx);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error evaluating response for question {QuestionId}", questionId);
            throw new Exception("Evaluation failed", ex);
        }
    }
}