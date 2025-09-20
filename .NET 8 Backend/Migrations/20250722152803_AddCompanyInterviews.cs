using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyInterviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterviewQuestions_Domains_DomainId",
                table: "InterviewQuestions");

            migrationBuilder.DropForeignKey(
                name: "FK_InterviewResponses_InterviewQuestions_QuestionId",
                table: "InterviewResponses");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Domains",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateTable(
                name: "CompanyInterviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyInterviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyInterviews_AspNetUsers_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CompanyInterviewQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyInterviewId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    IdealAnswer = table.Column<string>(type: "text", nullable: false),
                    AudioUrl = table.Column<string>(type: "text", nullable: true),
                    Difficulty = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyInterviewQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyInterviewQuestions_CompanyInterviews_CompanyIntervie~",
                        column: x => x.CompanyInterviewId,
                        principalTable: "CompanyInterviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CompanyInterviewSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyInterviewId = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateEmail = table.Column<string>(type: "text", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyInterviewSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyInterviewSessions_CompanyInterviews_CompanyInterview~",
                        column: x => x.CompanyInterviewId,
                        principalTable: "CompanyInterviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CandidateInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyInterviewId = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    UniqueLinkToken = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CandidateInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CandidateInvitations_CompanyInterviewSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "CompanyInterviewSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CandidateInvitations_CompanyInterviews_CompanyInterviewId",
                        column: x => x.CompanyInterviewId,
                        principalTable: "CompanyInterviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CompanyInterviewResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyInterviewQuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    UserAudioUrl = table.Column<string>(type: "text", nullable: true),
                    UserAudioTranscribed = table.Column<string>(type: "text", nullable: true),
                    Feedback = table.Column<string>(type: "text", nullable: true),
                    Score = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyInterviewResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompanyInterviewResponses_CompanyInterviewQuestions_Company~",
                        column: x => x.CompanyInterviewQuestionId,
                        principalTable: "CompanyInterviewQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CompanyInterviewResponses_CompanyInterviewSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "CompanyInterviewSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CandidateInvitations_CompanyInterviewId",
                table: "CandidateInvitations",
                column: "CompanyInterviewId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidateInvitations_SessionId",
                table: "CandidateInvitations",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidateInvitations_UniqueLinkToken",
                table: "CandidateInvitations",
                column: "UniqueLinkToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompanyInterviewQuestions_CompanyInterviewId",
                table: "CompanyInterviewQuestions",
                column: "CompanyInterviewId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyInterviewResponses_CompanyInterviewQuestionId",
                table: "CompanyInterviewResponses",
                column: "CompanyInterviewQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyInterviewResponses_SessionId",
                table: "CompanyInterviewResponses",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyInterviews_CompanyId",
                table: "CompanyInterviews",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyInterviewSessions_CompanyInterviewId",
                table: "CompanyInterviewSessions",
                column: "CompanyInterviewId");

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewQuestions_Domains_DomainId",
                table: "InterviewQuestions",
                column: "DomainId",
                principalTable: "Domains",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewResponses_InterviewQuestions_QuestionId",
                table: "InterviewResponses",
                column: "QuestionId",
                principalTable: "InterviewQuestions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterviewQuestions_Domains_DomainId",
                table: "InterviewQuestions");

            migrationBuilder.DropForeignKey(
                name: "FK_InterviewResponses_InterviewQuestions_QuestionId",
                table: "InterviewResponses");

            migrationBuilder.DropTable(
                name: "CandidateInvitations");

            migrationBuilder.DropTable(
                name: "CompanyInterviewResponses");

            migrationBuilder.DropTable(
                name: "CompanyInterviewQuestions");

            migrationBuilder.DropTable(
                name: "CompanyInterviewSessions");

            migrationBuilder.DropTable(
                name: "CompanyInterviews");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Domains",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewQuestions_Domains_DomainId",
                table: "InterviewQuestions",
                column: "DomainId",
                principalTable: "Domains",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewResponses_InterviewQuestions_QuestionId",
                table: "InterviewResponses",
                column: "QuestionId",
                principalTable: "InterviewQuestions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
