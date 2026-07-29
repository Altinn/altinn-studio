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
            // Metadata-only on PostgreSQL 11+, so these stay transactional and cheap.
            migrationBuilder.AddColumn<int>(
                name: "defer_count",
                schema: "engine",
                table: "steps",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            // first_deferred_at anchors the wait budget; last_deferred_at anchors the retry deadline
            // for errors occurring after a deferral. Both are needed: collapsing them onto one column
            // makes one of the two clocks measure the wrong span.
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "first_deferred_at",
                schema: "engine",
                table: "steps",
                type: "timestamp with time zone",
                nullable: true
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "last_deferred_at",
                schema: "engine",
                table: "steps",
                type: "timestamp with time zone",
                nullable: true
            );

            SwapFetchGateIndex(migrationBuilder, "status IN (0, 2, 8)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            SwapFetchGateIndex(migrationBuilder, "status IN (0, 2)");

            migrationBuilder.DropColumn(name: "defer_count", schema: "engine", table: "steps");

            migrationBuilder.DropColumn(name: "first_deferred_at", schema: "engine", table: "steps");

            migrationBuilder.DropColumn(name: "last_deferred_at", schema: "engine", table: "steps");
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
