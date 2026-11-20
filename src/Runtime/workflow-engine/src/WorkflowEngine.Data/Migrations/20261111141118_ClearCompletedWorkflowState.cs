using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class ClearCompletedWorkflowState : Migration
    {
        /// <summary>
        /// Partial index over the completed workflows whose state retention has not cleared yet, backing the
        /// completed state sweep.
        /// </summary>
        private const string IndexName = "ix_workflows_updated_at_completed_state";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nullable with no default, so metadata-only on PostgreSQL 11+. IF NOT EXISTS because the index
            // build below suppresses the transaction: a failure there leaves the column committed with the
            // migration unrecorded, and the automatic re-run on the next startup must pass over it.
            //
            // state_cleared_at is when retention cleared the workflow's initial state and its steps' state
            // out. Every completed workflow starts out null, so the first sweeps after this migration clear
            // the backlog in batches.
            migrationBuilder.Sql(
                """
                ALTER TABLE engine.workflows
                    ADD COLUMN IF NOT EXISTS state_cleared_at timestamp with time zone;
                """
            );

            // CONCURRENTLY because engine.workflows is the hot table every worker polls. The status literal
            // mirrors PersistentItemStatusMap.SuccessfulSqlList, hardcoded because migrations are frozen
            // history. The drop-first guard clears the INVALID index a failed concurrent build leaves behind,
            // which IF NOT EXISTS on its own would keep.
            migrationBuilder.Sql($"DROP INDEX CONCURRENTLY IF EXISTS engine.{IndexName};", suppressTransaction: true);

            migrationBuilder.Sql(
                $"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {IndexName}
                    ON engine.workflows (updated_at)
                    WHERE status IN (3) AND state_cleared_at IS NULL;
                """,
                suppressTransaction: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($"DROP INDEX CONCURRENTLY IF EXISTS engine.{IndexName};", suppressTransaction: true);

            migrationBuilder.Sql("ALTER TABLE engine.workflows DROP COLUMN IF EXISTS state_cleared_at;");
        }
    }
}
