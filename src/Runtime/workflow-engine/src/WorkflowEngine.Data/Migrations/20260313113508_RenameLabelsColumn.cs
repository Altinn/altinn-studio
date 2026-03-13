using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameLabelsColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(name: "LabelsJson", table: "Workflows", newName: "Labels");

            migrationBuilder.RenameIndex(
                name: "IX_Workflows_LabelsJson",
                table: "Workflows",
                newName: "IX_Workflows_Labels"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(name: "Labels", table: "Workflows", newName: "LabelsJson");

            migrationBuilder.RenameIndex(
                name: "IX_Workflows_Labels",
                table: "Workflows",
                newName: "IX_Workflows_LabelsJson"
            );
        }
    }
}
