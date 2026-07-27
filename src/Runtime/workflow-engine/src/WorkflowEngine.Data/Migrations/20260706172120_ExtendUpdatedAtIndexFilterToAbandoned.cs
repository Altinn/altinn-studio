using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExtendUpdatedAtIndexFilterToAbandoned : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_workflows_updated_at", schema: "engine", table: "workflows");

            migrationBuilder.CreateIndex(
                name: "ix_workflows_updated_at",
                schema: "engine",
                table: "workflows",
                column: "updated_at",
                filter: "status IN (3, 4, 5, 6, 7)"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_workflows_updated_at", schema: "engine", table: "workflows");

            migrationBuilder.CreateIndex(
                name: "ix_workflows_updated_at",
                schema: "engine",
                table: "workflows",
                column: "updated_at",
                filter: "status IN (3, 4, 5, 6)"
            );
        }
    }
}
