using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class AddAverageScoreToCompanyInterviewSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AverageScore",
                table: "CompanyInterviews");

            migrationBuilder.AddColumn<double>(
                name: "AverageScore",
                table: "CompanyInterviewSessions",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AverageScore",
                table: "CompanyInterviewSessions");

            migrationBuilder.AddColumn<double>(
                name: "AverageScore",
                table: "CompanyInterviews",
                type: "double precision",
                nullable: true);
        }
    }
}
