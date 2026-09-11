using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExecutionStartedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nullable with no default, so metadata-only on PostgreSQL 11+: transactional and cheap
            // even on the hot workflows table. IF NOT EXISTS keeps the migration re-runnable like
            // every other engine migration — UseWorkflowEngine() applies them at startup.
            //
            // execution_started_at is the start of the most recent attempt: the handler stamps it on
            // every attempt and the write-back persists it, so a status read can tell queue wait from
            // processing time. NULL whenever the workflow is Enqueued: before the first attempt, and again
            // after resume, a stale reclaim or dependency recovery return it there.
            migrationBuilder.Sql(
                """
                ALTER TABLE engine.workflows
                    ADD COLUMN IF NOT EXISTS execution_started_at timestamp with time zone;
                """
            );

            migrationBuilder.Sql(
                """
                ALTER TABLE engine.steps
                    ADD COLUMN IF NOT EXISTS execution_started_at timestamp with time zone;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE engine.steps DROP COLUMN IF EXISTS execution_started_at;");
            migrationBuilder.Sql("ALTER TABLE engine.workflows DROP COLUMN IF EXISTS execution_started_at;");
        }
    }
}
