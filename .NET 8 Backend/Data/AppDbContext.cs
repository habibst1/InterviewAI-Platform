using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

public class AppDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<RegularUser> RegularUsers { get; set; }
    public DbSet<Company> Companies { get; set; }
    public DbSet<Admin> Admins { get; set; }

    public DbSet<Domain> Domains { get; set; }
    public DbSet<InterviewQuestion> InterviewQuestions { get; set; }
    public DbSet<InterviewSession> InterviewSessions { get; set; }
    public DbSet<InterviewResponse> InterviewResponses { get; set; }

    // Company workflow DbSets
    public DbSet<CompanyInterview> CompanyInterviews { get; set; }
    public DbSet<CompanyInterviewQuestion> CompanyInterviewQuestions { get; set; }
    public DbSet<CompanyInterviewSession> CompanyInterviewSessions { get; set; }
    public DbSet<CompanyInterviewResponse> CompanyInterviewResponses { get; set; }
    public DbSet<CandidateInvitation> CandidateInvitations { get; set; } // Added
    public DbSet<DomainConfiguration> DomainConfigurations { get; set; }
    public DbSet<ActivityLog> ActivityLogs { get; set; }
    public DbSet<SavedCandidate> SavedCandidates { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // TPH for User types
        builder.Entity<User>()
            .HasDiscriminator(u => u.Type)
            .HasValue<RegularUser>(UserType.Regular)
            .HasValue<Company>(UserType.Company)
            .HasValue<Admin>(UserType.Admin);

        // Public workflow relationships
        builder.Entity<InterviewSession>()
            .HasMany(s => s.Responses)
            .WithOne(r => r.Session)
            .HasForeignKey(r => r.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure InterviewSession -> Domain relationship ---
        builder.Entity<InterviewSession>()
            .HasOne(s => s.Domain) // Navigation property
            .WithMany() // Domain doesn't necessarily need a collection of sessions back
            .HasForeignKey(s => s.DomainId) // Foreign key property
            .OnDelete(DeleteBehavior.Restrict); // Prevent deleting a domain if sessions exist

        builder.Entity<InterviewResponse>()
            .HasOne(r => r.Question)
            .WithMany()
            .HasForeignKey(r => r.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<InterviewQuestion>()
            .HasOne(q => q.Domain)
            .WithMany(d => d.Questions)
            .HasForeignKey(q => q.DomainId)
            .OnDelete(DeleteBehavior.Cascade);

        // Constraints for InterviewQuestion
        builder.Entity<InterviewQuestion>()
            .Property(q => q.IdealAnswer)
            .IsRequired();

        // Unique index for Domain
        builder.Entity<Domain>()
            .HasIndex(d => d.Name)
            .IsUnique();

        builder.Entity<Domain>()
            .Property(d => d.Name)
            .HasMaxLength(100)
            .IsRequired();

        // Company workflow relationships
        builder.Entity<CompanyInterview>()
            .HasOne(i => i.Company)
            .WithMany(c => c.Interviews)
            .HasForeignKey(i => i.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<CompanyInterview>()
            .Property(i => i.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Entity<CompanyInterview>()
            .HasIndex(i => i.CompanyId);

        builder.Entity<CompanyInterviewQuestion>()
            .HasOne(q => q.CompanyInterview)
            .WithMany(i => i.Questions)
            .HasForeignKey(q => q.CompanyInterviewId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<CompanyInterviewSession>()
            .HasOne(s => s.CompanyInterview)
            .WithMany(i => i.Sessions)
            .HasForeignKey(s => s.CompanyInterviewId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<CompanyInterviewResponse>()
            .HasOne(r => r.Session)
            .WithMany(s => s.Responses)
            .HasForeignKey(r => r.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<CompanyInterviewResponse>()
            .HasOne(r => r.Question)
            .WithMany()
            .HasForeignKey(r => r.CompanyInterviewQuestionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<CandidateInvitation>()
            .HasOne(i => i.CompanyInterview)
            .WithMany(c => c.Invitations)
            .HasForeignKey(i => i.CompanyInterviewId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<CandidateInvitation>()
            .HasOne(i => i.Session)
            .WithMany()
            .HasForeignKey(i => i.SessionId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<CandidateInvitation>()
            .HasIndex(i => i.UniqueLinkToken)
            .IsUnique();

        builder.Entity<CandidateInvitation>()
            .Property(i => i.CandidateEmail)
            .HasMaxLength(255)
            .IsRequired();

        builder.Entity<CandidateInvitation>()
            .Property(i => i.UniqueLinkToken)
            .HasMaxLength(36)
            .IsRequired();

        builder.Entity<DomainConfiguration>()
            .HasOne(dc => dc.Domain)
            .WithOne(d => d.Configuration)
            .HasForeignKey<DomainConfiguration>(dc => dc.DomainId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure properties for DomainConfiguration
        builder.Entity<DomainConfiguration>()
            .Property(dc => dc.QuestionsPerE)
            .HasDefaultValue(2);

        builder.Entity<DomainConfiguration>()
            .Property(dc => dc.QuestionsPerD)
            .HasDefaultValue(2);

        builder.Entity<DomainConfiguration>()
            .Property(dc => dc.QuestionsPerC)
            .HasDefaultValue(2);

        builder.Entity<DomainConfiguration>()
            .Property(dc => dc.QuestionsPerB)
            .HasDefaultValue(2);

        builder.Entity<DomainConfiguration>()
            .Property(dc => dc.QuestionsPerA)
            .HasDefaultValue(2);

        // SavedCandidate configuration
        builder.Entity<SavedCandidate>()
            .HasOne(sc => sc.Company)
            .WithMany(c => c.SavedCandidates)
            .HasForeignKey(sc => sc.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SavedCandidate>()
            .HasOne(sc => sc.Session)
            .WithMany()
            .HasForeignKey(sc => sc.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SavedCandidate>()
            .HasOne(sc => sc.Interview)
            .WithMany()
            .HasForeignKey(sc => sc.InterviewId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SavedCandidate>()
            .HasIndex(sc => new { sc.CompanyId, sc.SessionId })
            .IsUnique();

        builder.Entity<SavedCandidate>()
            .Property(sc => sc.CandidateEmail)
            .HasMaxLength(255)
            .IsRequired();

        builder.Entity<SavedCandidate>()
            .Property(sc => sc.InterviewTitle)
            .HasMaxLength(200)
            .IsRequired();
    }
}