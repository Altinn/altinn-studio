using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStepDeferral : Migration
    {
        /// <summary>
        /// The fetch-gate index, whose partial filter must grow to include the new <c>Waiting</c>
        /// status (8).
        /// </summary>
        private const string IndexName = "ix_workflows_backoff_until_created_at";

        /// <summary>Staging name the replacement index is built under before taking over.</summary>
        private const string NewIndexName = "ix_workflows_backoff_until_created_at_new";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Metadata-only on PostgreSQL 11+, so these stay transactional and cheap. IF NOT EXISTS
            // because the index swap below suppresses the transaction: a failure there leaves these
            // columns committed with the migration unrecorded, and the automatic re-run on the next
            // startup must pass over them instead of dying on "column already exists".
            //
            // first_deferred_at anchors the wait budget; last_deferred_at anchors the retry deadline
            // for errors occurring after a deferral. Both are needed: collapsing them onto one column
            // makes one of the two clocks measure the wrong span.
            migrationBuilder.Sql(
                """
                ALTER TABLE engine.steps
                    ADD COLUMN IF NOT EXISTS defer_count integer NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS first_deferred_at timestamp with time zone,
                    ADD COLUMN IF NOT EXISTS last_deferred_at timestamp with time zone;
                """
            );

            SwapFetchGateIndex(migrationBuilder, "status IN (0, 2, 8)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            SwapFetchGateIndex(migrationBuilder, "status IN (0, 2)");

            migrationBuilder.Sql(
                """
                ALTER TABLE engine.steps
                    DROP COLUMN IF EXISTS defer_count,
                    DROP COLUMN IF EXISTS first_deferred_at,
                    DROP COLUMN IF EXISTS last_deferred_at;
                """
            );
        }

        /// <summary>
        /// Replaces the fetch-gate index with one carrying <paramref name="filter"/>.
        /// <para>
        /// <c>engine.workflows</c> is the engine's hot table — every worker polls it — so the filter
        /// change is applied as a concurrent swap rather than EF's default drop-and-recreate, which
        /// would hold ACCESS EXCLUSIVE for the whole index build and stall the processing loop and
        /// the API for its duration.
        /// </para>
        /// <para>
        /// Ordering matters: build the replacement first so the fetch path is never left without an
        /// index, then drop the old one, then take over its name. <c>CONCURRENTLY</c> cannot run
        /// inside a transaction, hence <c>suppressTransaction</c>; the DDL is written to be
        /// re-runnable because a failed concurrent build leaves an INVALID index behind.
        /// </para>
        /// </summary>
        private static void SwapFetchGateIndex(MigrationBuilder migrationBuilder, string filter)
        {
            // A previous failed run may have left an invalid index under the staging name.
            migrationBuilder.Sql(
                $"DROP INDEX CONCURRENTLY IF EXISTS engine.{NewIndexName};",
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                $"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {NewIndexName}
                    ON engine.workflows (backoff_until NULLS FIRST, created_at NULLS LAST)
                    WHERE {filter};
                """,
                suppressTransaction: true
            );

            migrationBuilder.Sql($"DROP INDEX CONCURRENTLY IF EXISTS engine.{IndexName};", suppressTransaction: true);

            migrationBuilder.Sql(
                $"ALTER INDEX engine.{NewIndexName} RENAME TO {IndexName};",
                suppressTransaction: true
            );
        }
    }
}
