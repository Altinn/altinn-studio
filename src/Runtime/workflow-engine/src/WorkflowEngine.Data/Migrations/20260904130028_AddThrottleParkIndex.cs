using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddThrottleParkIndex : Migration
    {
        /// <summary>
        /// Partial index over <c>Requeued</c> workflows backing the throttle sweep's park pass,
        /// which walks one namespace's requeued population in keyset pages ordered by <c>id</c>.
        /// </summary>
        private const string ParkIndexName = "ix_workflows_namespace_id_requeued";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // id is a key column, not a trailing INCLUDE, because the park pass's page boundary
            // (id > @afterId ORDER BY id) has to narrow the scan rather than filter what it
            // already read: with no index offering that, the planner drives the walk off the
            // primary key and each page re-reads every row the earlier pages walked.
            //
            // throttled_until is an INCLUDE column for the same reason it is one on the fetch-gate
            // index: never an ordering or range key, only the residual filter — here the one that
            // rejects the already-parked majority — so carrying it out of the btree key answers a
            // whole page from the index instead of a heap visit per candidate.
            //
            // Separate from ix_workflows_namespace_status_incomplete rather than folded into it as
            // a third key column: (namespace, status) repeats across a namespace and dedupes to a
            // fraction of its unique-keyed size, which id would forfeit for the counts query that
            // never needs it. This index carries only requeued rows, a small population outside a
            // storm.
            //
            // The status literal mirrors PersistentItemStatusMap.RequeuedSqlLiteral, hardcoded
            // because migrations are frozen history. Re-runnable: CONCURRENTLY suppresses the
            // transaction, so a failure commits the DDL with the migration unrecorded and the
            // automatic re-run on the next startup has to pass over what already landed. The
            // drop-first guard clears the INVALID index a previously failed concurrent build
            // leaves behind, which IF NOT EXISTS on its own would silently keep.
            migrationBuilder.Sql(
                $"DROP INDEX CONCURRENTLY IF EXISTS engine.{ParkIndexName};",
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                $"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {ParkIndexName}
                    ON engine.workflows (namespace, id)
                    INCLUDE (throttled_until)
                    WHERE status = 2;
                """,
                suppressTransaction: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                $"DROP INDEX CONCURRENTLY IF EXISTS engine.{ParkIndexName};",
                suppressTransaction: true
            );
        }
    }
}
