using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStepFirstFailedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nullable with no default, so metadata-only on PostgreSQL 11+: transactional and cheap. IF NOT EXISTS
            // keeps the migration re-runnable like every other engine migration, since UseWorkflowEngine() applies
            // them at startup.
            //
            // first_failed_at is when the step's current run of failed attempts began: set by the failure that takes
            // requeue_count from 0 to 1, and cleared with it. NULL on existing rows until their step fails again.
            migrationBuilder.Sql(
                """
                ALTER TABLE engine.steps
                    ADD COLUMN IF NOT EXISTS first_failed_at timestamp with time zone;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE engine.steps DROP COLUMN IF EXISTS first_failed_at;");
        }
    }
}
