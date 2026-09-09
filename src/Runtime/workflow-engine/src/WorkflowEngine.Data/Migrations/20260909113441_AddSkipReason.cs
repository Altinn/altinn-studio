using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSkipReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Status 7 used to be the operator write-off and is now Skipped. An old write-off left its failed
            // step in place, while a Skipped workflow holds only Completed (3) and Skipped steps, so the steps
            // of existing status-7 rows are normalized. The literals mirror PersistentItemStatus (hardcoded
            // here because migrations are frozen history).
            migrationBuilder.Sql(
                """
                UPDATE engine.steps s
                SET status = 7
                FROM engine.workflows w
                WHERE s.job_id = w.id AND w.status = 7 AND s.status <> 3;
                """
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
            // The step normalization is not reversed: a status-7 workflow's steps read as Skipped under the
            // new engine and as the old write-off status under the old, and both are terminal.
            migrationBuilder.DropColumn(name: "skip_reason", schema: "engine", table: "steps");
        }
    }
}
