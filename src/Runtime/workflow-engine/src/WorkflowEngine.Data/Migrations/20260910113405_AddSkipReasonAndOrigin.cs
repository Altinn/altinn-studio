using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSkipReasonAndOrigin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Status 7 was the operator write-off, which left its failed step in place; a Skipped workflow holds
            // only Completed (3) and Skipped (7) steps.
            migrationBuilder.Sql(
                """
                UPDATE engine.steps s
                SET status = 7
                FROM engine.workflows w
                WHERE s.job_id = w.id AND w.status = 7 AND s.status <> 3;
                """
            );

            migrationBuilder.AddColumn<int>(
                name: "skip_origin",
                schema: "engine",
                table: "steps",
                type: "integer",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "skip_reason",
                schema: "engine",
                table: "steps",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The step normalization is not reversed: both readings of a status-7 workflow are terminal.
            migrationBuilder.DropColumn(name: "skip_origin", schema: "engine", table: "steps");

            migrationBuilder.DropColumn(name: "skip_reason", schema: "engine", table: "steps");
        }
    }
}
