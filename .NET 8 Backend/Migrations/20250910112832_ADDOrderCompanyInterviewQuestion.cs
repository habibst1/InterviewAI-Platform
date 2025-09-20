using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class ADDOrderCompanyInterviewQuestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "CompanyInterviewQuestions",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Order",
                table: "CompanyInterviewQuestions");
        }
    }
}
