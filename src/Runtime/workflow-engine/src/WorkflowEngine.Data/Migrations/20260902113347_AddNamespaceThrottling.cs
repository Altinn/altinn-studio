using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNamespaceThrottling : Migration
    {
        /// <summary>
        /// The fetch-gate index, which must additionally carry <c>throttled_until</c> so the
        /// throttle-gated fetch variant keeps being served entirely by this index.
        /// </summary>
        private const string FetchGateIndexName = "ix_workflows_backoff_until_created_at";

        /// <summary>Staging name the replacement fetch-gate index is built under before taking over.</summary>
        private const string NewFetchGateIndexName = "ix_workflows_backoff_until_created_at_new";

        /// <summary>
        /// Partial index backing the throttle sweep's per-namespace <c>GROUP BY</c> counts over
        /// incomplete workflows. <c>status</c> is a second key column so requeued-vs-active counts
        /// resolve from the index alone.
        /// </summary>
        private const string NamespaceCountIndexName = "ix_workflows_namespace_status_incomplete";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Metadata-only on PostgreSQL 11+, so these stay transactional and cheap. IF NOT EXISTS
            // because the concurrent index work below suppresses the transaction: a failure there
            // leaves this DDL committed with the migration unrecorded, and the automatic re-run on
            // the next startup must pass over it instead of dying on "already exists".
            //
            // throttled_until is a scheduling gate parallel to backoff_until, written only by the
            // failure-storm throttling circuit breaker (namespace_throttles holds its per-namespace
            // state; the sweep is the sole writer of that table). backoff_until stays purely the
            // retry/schedule clock so throttle effects remain identifiable and undoable.
            migrationBuilder.Sql(
                """
                ALTER TABLE engine.workflows
                    ADD COLUMN IF NOT EXISTS throttled_until timestamp with time zone;
                """
            );

            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS engine.namespace_throttles (
                    namespace character varying(200) NOT NULL,
                    state integer NOT NULL,
                    tripped_at timestamp with time zone NOT NULL,
                    current_window interval NOT NULL,
                    canaries jsonb,
                    last_evaluated_at timestamp with time zone,
                    last_requeued_count integer NOT NULL,
                    last_active_count integer NOT NULL,
                    updated_at timestamp with time zone,
                    CONSTRAINT pk_namespace_throttles PRIMARY KEY (namespace)
                );
                """
            );

            // throttled_until rides along as an INCLUDE column rather than a key: it is only ever
            // a residual filter in the fetch query — never an ordering or range key — so keeping
            // it out of the btree key preserves the existing key shape and comparison costs while
            // making the column available to index-only reads. Deliberately NOT part of the
            // partial filter: parked workflows must become fetch-eligible by natural time elapse
            // (throttled_until <= now), not only by an explicit clear.
            SwapFetchGateIndex(migrationBuilder, includeThrottledUntil: true);

            // Fresh index, so no swap is needed — but a previously failed CONCURRENTLY build
            // leaves an INVALID index behind that IF NOT EXISTS would silently keep, hence the
            // drop-first guard. The status literals mirror PersistentItemStatusMap.IncompleteSqlList
            // (hardcoded here because migrations are frozen history).
            migrationBuilder.Sql(
                $"DROP INDEX CONCURRENTLY IF EXISTS engine.{NamespaceCountIndexName};",
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                $"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {NamespaceCountIndexName}
                    ON engine.workflows (namespace, status)
                    WHERE status IN (0, 1, 2, 8, 9);
                """,
                suppressTransaction: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            SwapFetchGateIndex(migrationBuilder, includeThrottledUntil: false);

            migrationBuilder.Sql(
                $"DROP INDEX CONCURRENTLY IF EXISTS engine.{NamespaceCountIndexName};",
                suppressTransaction: true
            );

            migrationBuilder.Sql("DROP TABLE IF EXISTS engine.namespace_throttles;");

            migrationBuilder.Sql(
                """
                ALTER TABLE engine.workflows
                    DROP COLUMN IF EXISTS throttled_until;
                """
            );
        }

        /// <summary>
        /// Replaces the fetch-gate index with one that carries (or drops) the
        /// <c>throttled_until</c> INCLUDE column.
        /// <para>
        /// <c>engine.workflows</c> is the engine's hot table — every worker polls it — so the
        /// change is applied as a concurrent swap rather than EF's default drop-and-recreate,
        /// which would hold ACCESS EXCLUSIVE for the whole index build and stall the processing
        /// loop and the API for its duration.
        /// </para>
        /// <para>
        /// Ordering matters: build the replacement first so the fetch path is never left without
        /// an index, then drop the old one, then take over its name. <c>CONCURRENTLY</c> cannot
        /// run inside a transaction, hence <c>suppressTransaction</c>; the DDL is written to be
        /// re-runnable because a failed concurrent build leaves an INVALID index behind.
        /// </para>
        /// </summary>
        private static void SwapFetchGateIndex(MigrationBuilder migrationBuilder, bool includeThrottledUntil)
        {
            var include = includeThrottledUntil ? " INCLUDE (throttled_until)" : "";

            // A previous failed run may have left an invalid index under the staging name.
            migrationBuilder.Sql(
                $"DROP INDEX CONCURRENTLY IF EXISTS engine.{NewFetchGateIndexName};",
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                $"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {NewFetchGateIndexName}
                    ON engine.workflows (backoff_until NULLS FIRST, created_at NULLS LAST){include}
                    WHERE status IN (0, 2, 8);
                """,
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                $"DROP INDEX CONCURRENTLY IF EXISTS engine.{FetchGateIndexName};",
                suppressTransaction: true
            );

            migrationBuilder.Sql(
                $"ALTER INDEX engine.{NewFetchGateIndexName} RENAME TO {FetchGateIndexName};",
                suppressTransaction: true
            );
        }
    }
}
