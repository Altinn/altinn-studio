using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoveToEngineSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "engine");

            migrationBuilder.RenameTable(name: "Workflows", newName: "Workflows", newSchema: "engine");

            migrationBuilder.RenameTable(name: "WorkflowLink", newName: "WorkflowLink", newSchema: "engine");

            migrationBuilder.RenameTable(
                name: "WorkflowDependency",
                newName: "WorkflowDependency",
                newSchema: "engine"
            );

            migrationBuilder.RenameTable(name: "Steps", newName: "Steps", newSchema: "engine");

            migrationBuilder.RenameTable(name: "IdempotencyKeys", newName: "IdempotencyKeys", newSchema: "engine");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(name: "Workflows", schema: "engine", newName: "Workflows");

            migrationBuilder.RenameTable(name: "WorkflowLink", schema: "engine", newName: "WorkflowLink");

            migrationBuilder.RenameTable(name: "WorkflowDependency", schema: "engine", newName: "WorkflowDependency");

            migrationBuilder.RenameTable(name: "Steps", schema: "engine", newName: "Steps");

            migrationBuilder.RenameTable(name: "IdempotencyKeys", schema: "engine", newName: "IdempotencyKeys");
        }
    }
}
