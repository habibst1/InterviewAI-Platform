using System.Net;
using System.Net.Mail;

public interface IEmailService
{
    Task SendInterviewInvitationAsync(string candidateEmail, string companyName, string interviewTitle, string uniqueLink);
}

public class SmtpEmailService : IEmailService
{
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly IConfiguration _configuration;

    public SmtpEmailService(ILogger<SmtpEmailService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public async Task SendInterviewInvitationAsync(string candidateEmail, string companyName, string interviewTitle, string uniqueLink)
    {
        try
        {
            using var client = new SmtpClient(_configuration["Smtp:Host"], int.Parse(_configuration["Smtp:Port"]!))
            {
                Credentials = new NetworkCredential(_configuration["Smtp:Username"], _configuration["Smtp:Password"]),
                EnableSsl = bool.Parse(_configuration["Smtp:EnableSsl"]!)
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_configuration["Smtp:FromAddress"]!, companyName),
                Subject = $"Interview Invitation: {interviewTitle}",
                Body = $@"Dear Candidate,

You have been invited by {companyName} to participate in an interview titled ""{interviewTitle}"".

Please access the interview using the following link:
{uniqueLink}

This link is unique to you and can only be used once. Please complete the interview at your earliest convenience.

Best regards,
{companyName}",
                IsBodyHtml = false
            };
            mailMessage.To.Add(candidateEmail);

            await client.SendMailAsync(mailMessage);
            _logger.LogInformation("Sent interview invitation to {CandidateEmail}", candidateEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {CandidateEmail}", candidateEmail);
            throw;
        }
    }
}