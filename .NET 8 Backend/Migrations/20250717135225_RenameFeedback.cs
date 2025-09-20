using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class RenameFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Transcription",
                table: "InterviewResponses",
                newName: "Feedback");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Feedback",
                table: "InterviewResponses",
                newName: "Transcription");
        }
    }
}
