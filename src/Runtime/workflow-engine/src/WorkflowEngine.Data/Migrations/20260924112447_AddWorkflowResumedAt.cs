using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowResumedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nullable with no default, so metadata-only on PostgreSQL 11+. IF NOT EXISTS keeps the
            // migration re-runnable like every other engine migration — UseWorkflowEngine() applies
            // them at startup.
            //
            // resumed_at is when the workflow was last resumed. Resume reruns a workflow in place and
            // keeps created_at, so consumers timing the current run start from this when it is set.
            migrationBuilder.Sql(
                """
                ALTER TABLE engine.workflows
                    ADD COLUMN IF NOT EXISTS resumed_at timestamp with time zone;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE engine.workflows DROP COLUMN IF EXISTS resumed_at;");
        }
    }
}
