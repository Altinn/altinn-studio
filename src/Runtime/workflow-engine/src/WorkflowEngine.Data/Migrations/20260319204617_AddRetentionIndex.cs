using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRetentionIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Workflows_UpdatedAt",
                schema: "engine",
                table: "Workflows",
                column: "UpdatedAt",
                filter: "\"Status\" IN (3, 4, 5, 6)"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_UpdatedAt", schema: "engine", table: "Workflows");
        }
    }
}
