using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedCandidates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SavedCandidates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    InterviewId = table.Column<Guid>(type: "uuid", nullable: false),
                    InterviewTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AverageScore = table.Column<double>(type: "double precision", nullable: true),
                    SavedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedCandidates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SavedCandidates_AspNetUsers_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SavedCandidates_CompanyInterviewSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "CompanyInterviewSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SavedCandidates_CompanyInterviews_InterviewId",
                        column: x => x.InterviewId,
                        principalTable: "CompanyInterviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SavedCandidates_CompanyId_SessionId",
                table: "SavedCandidates",
                columns: new[] { "CompanyId", "SessionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedCandidates_InterviewId",
                table: "SavedCandidates",
                column: "InterviewId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedCandidates_SessionId",
                table: "SavedCandidates",
                column: "SessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SavedCandidates");
        }
    }
}
