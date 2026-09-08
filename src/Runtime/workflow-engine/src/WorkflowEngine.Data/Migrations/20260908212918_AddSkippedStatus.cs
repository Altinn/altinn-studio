using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSkippedStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_workflows_updated_at", schema: "engine", table: "workflows");

            migrationBuilder.AddColumn<string>(
                name: "skip_reason",
                schema: "engine",
                table: "steps",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflows_updated_at",
                schema: "engine",
                table: "workflows",
                column: "updated_at",
                filter: "status IN (3, 4, 5, 6, 7, 10)"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_workflows_updated_at", schema: "engine", table: "workflows");

            migrationBuilder.DropColumn(name: "skip_reason", schema: "engine", table: "steps");

            migrationBuilder.CreateIndex(
                name: "ix_workflows_updated_at",
                schema: "engine",
                table: "workflows",
                column: "updated_at",
                filter: "status IN (3, 4, 5, 6, 7)"
            );
        }
    }
}
