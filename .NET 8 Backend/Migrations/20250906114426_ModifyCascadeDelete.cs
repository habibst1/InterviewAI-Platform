using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class ModifyCascadeDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterviewQuestions_Domains_DomainId",
                table: "InterviewQuestions");

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewQuestions_Domains_DomainId",
                table: "InterviewQuestions",
                column: "DomainId",
                principalTable: "Domains",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterviewQuestions_Domains_DomainId",
                table: "InterviewQuestions");

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewQuestions_Domains_DomainId",
                table: "InterviewQuestions",
                column: "DomainId",
                principalTable: "Domains",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
