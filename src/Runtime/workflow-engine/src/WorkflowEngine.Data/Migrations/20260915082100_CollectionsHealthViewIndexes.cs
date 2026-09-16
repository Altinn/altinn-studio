using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class CollectionsHealthViewIndexes : Migration
    {
        private const string CollectionLookupIndexName = "ix_workflows_collection_key_namespace";
        private const string FailedCollectionLookupIndexName = "ix_workflows_namespace_collection_key_failed";
        private const string CollectionPageIndexName = "ix_workflow_collections_namespace_key";
        private const string OldCollectionLookupIndexName = "ix_workflows_collection_key";
        private const string OldCollectionPageIndexName = "ix_workflow_collections_namespace";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // engine.workflows is the engine's hot table, and workflow_collections is written on
            // every collection enqueue. Build replacements before dropping their predecessors and
            // do all index work concurrently so a deployment never blocks those write paths for a
            // full table scan. A failed concurrent build leaves an INVALID index behind, hence the
            // drop-first guards; every statement is independently re-runnable because suppressing
            // the transaction means a failed migration is retried from partially committed DDL.
            CreateIndexConcurrently(
                migrationBuilder,
                CollectionLookupIndexName,
                """
                ON engine.workflows (collection_key, namespace)
                INCLUDE (status, is_head)
                """
            );

            CreateIndexConcurrently(
                migrationBuilder,
                FailedCollectionLookupIndexName,
                """
                ON engine.workflows (namespace, collection_key)
                INCLUDE (is_head)
                WHERE status IN (4, 5, 6)
                """
            );

            CreateIndexConcurrently(
                migrationBuilder,
                CollectionPageIndexName,
                """
                ON engine.workflow_collections (namespace, key)
                """
            );

            DropIndexConcurrently(migrationBuilder, OldCollectionLookupIndexName);
            DropIndexConcurrently(migrationBuilder, OldCollectionPageIndexName);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restore the predecessor indexes before removing their replacements, preserving query
            // coverage throughout a rollback and applying the same non-blocking, re-runnable rules
            // as Up.
            CreateIndexConcurrently(
                migrationBuilder,
                OldCollectionLookupIndexName,
                """
                ON engine.workflows (collection_key)
                """
            );

            CreateIndexConcurrently(
                migrationBuilder,
                OldCollectionPageIndexName,
                """
                ON engine.workflow_collections (namespace)
                """
            );

            DropIndexConcurrently(migrationBuilder, CollectionLookupIndexName);
            DropIndexConcurrently(migrationBuilder, FailedCollectionLookupIndexName);
            DropIndexConcurrently(migrationBuilder, CollectionPageIndexName);
        }

        /// <summary>
        /// Drops any invalid remnant of an earlier attempt, then builds the requested index without
        /// blocking writes. Concurrent index commands cannot run inside the migration transaction.
        /// </summary>
        private static void CreateIndexConcurrently(
            MigrationBuilder migrationBuilder,
            string indexName,
            string definition
        )
        {
            DropIndexConcurrently(migrationBuilder, indexName);
            migrationBuilder.Sql(
                $"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {indexName}
                    {definition};
                """,
                suppressTransaction: true
            );
        }

        private static void DropIndexConcurrently(MigrationBuilder migrationBuilder, string indexName)
        {
            migrationBuilder.Sql($"DROP INDEX CONCURRENTLY IF EXISTS engine.{indexName};", suppressTransaction: true);
        }
    }
}
