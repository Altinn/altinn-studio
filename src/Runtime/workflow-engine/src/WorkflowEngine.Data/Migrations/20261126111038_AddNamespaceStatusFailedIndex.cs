using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNamespaceStatusFailedIndex : Migration
    {
        private const string IndexName = "ix_workflows_namespace_status_failed";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // CONCURRENTLY, so the build does not block writes to the engine's hot table while it scans it. The
            // status literals mirror PersistentItemStatusMap.FailedSqlList, hardcoded because migrations are frozen
            // history. Re-runnable: CONCURRENTLY suppresses the transaction, so a failed build leaves an INVALID
            // index with the migration unrecorded, which the drop-first guard clears on the next startup's re-run
            // and IF NOT EXISTS alone would keep.
            migrationBuilder.Sql($"DROP INDEX CONCURRENTLY IF EXISTS engine.{IndexName};", suppressTransaction: true);

            migrationBuilder.Sql(
                $"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {IndexName}
                    ON engine.workflows (namespace, status)
                    WHERE status IN (4, 5, 6);
                """,
                suppressTransaction: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($"DROP INDEX CONCURRENTLY IF EXISTS engine.{IndexName};", suppressTransaction: true);
        }
    }
}
