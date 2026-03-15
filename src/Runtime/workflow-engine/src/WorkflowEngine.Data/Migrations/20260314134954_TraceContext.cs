using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class TraceContext : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(name: "TraceContext", table: "Workflows", newName: "EngineTraceContext");

            migrationBuilder.RenameColumn(
                name: "EngineTraceId",
                table: "Workflows",
                newName: "DistributedTraceContext"
            );

            migrationBuilder.AddColumn<string>(
                name: "EngineTraceContext",
                table: "Steps",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "EngineTraceContext", table: "Steps");

            migrationBuilder.RenameColumn(name: "EngineTraceContext", table: "Workflows", newName: "TraceContext");

            migrationBuilder.RenameColumn(
                name: "DistributedTraceContext",
                table: "Workflows",
                newName: "EngineTraceId"
            );
        }
    }
}
