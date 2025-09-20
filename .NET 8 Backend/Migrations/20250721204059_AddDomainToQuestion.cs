using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class AddDomainToQuestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Domain",
                table: "InterviewQuestions");

            migrationBuilder.AddColumn<Guid>(
                name: "DomainId",
                table: "InterviewQuestions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Domains",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Domains", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InterviewQuestions_DomainId",
                table: "InterviewQuestions",
                column: "DomainId");

            migrationBuilder.CreateIndex(
                name: "IX_Domains_Name",
                table: "Domains",
                column: "Name",
                unique: true);

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

            migrationBuilder.DropTable(
                name: "Domains");

            migrationBuilder.DropIndex(
                name: "IX_InterviewQuestions_DomainId",
                table: "InterviewQuestions");

            migrationBuilder.DropColumn(
                name: "DomainId",
                table: "InterviewQuestions");

            migrationBuilder.AddColumn<string>(
                name: "Domain",
                table: "InterviewQuestions",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
