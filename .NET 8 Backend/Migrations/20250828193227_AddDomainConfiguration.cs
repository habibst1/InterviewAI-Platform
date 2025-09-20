using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Interview_Simulator.Migrations
{
    /// <inheritdoc />
    public partial class AddDomainConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DomainConfiguration",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DomainId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionsPerE = table.Column<int>(type: "integer", nullable: false),
                    QuestionsPerD = table.Column<int>(type: "integer", nullable: false),
                    QuestionsPerC = table.Column<int>(type: "integer", nullable: false),
                    QuestionsPerB = table.Column<int>(type: "integer", nullable: false),
                    QuestionsPerA = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DomainConfiguration", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DomainConfiguration_Domains_DomainId",
                        column: x => x.DomainId,
                        principalTable: "Domains",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DomainConfiguration_DomainId",
                table: "DomainConfiguration",
                column: "DomainId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DomainConfiguration");
        }
    }
}
