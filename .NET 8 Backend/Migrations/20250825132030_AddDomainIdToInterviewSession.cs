using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class AddDomainIdToInterviewSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DomainId",
                table: "InterviewSessions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_InterviewSessions_DomainId",
                table: "InterviewSessions",
                column: "DomainId");

            migrationBuilder.AddForeignKey(
                name: "FK_InterviewSessions_Domains_DomainId",
                table: "InterviewSessions",
                column: "DomainId",
                principalTable: "Domains",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InterviewSessions_Domains_DomainId",
                table: "InterviewSessions");

            migrationBuilder.DropIndex(
                name: "IX_InterviewSessions_DomainId",
                table: "InterviewSessions");

            migrationBuilder.DropColumn(
                name: "DomainId",
                table: "InterviewSessions");
        }
    }
}
