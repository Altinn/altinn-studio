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
            // full table scan. Each replacement is built under a staging name and swapped in only
            // after the build succeeds, so a retry never removes a valid index before its successor
            // is ready. Every statement is independently committed because concurrent index work
            // cannot run in the migration transaction.
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
        /// Builds a staging index without blocking writes, then swaps it into the requested name.
        /// A retry may discard a failed or completed staging build, but keeps an existing valid
        /// target index available until the new staging index has finished building.
        /// </summary>
        private static void CreateIndexConcurrently(
            MigrationBuilder migrationBuilder,
            string indexName,
            string definition
        )
        {
            var stagingIndexName = $"{indexName}_new";

            // A failed concurrent build can leave an INVALID staging index behind. The final index
            // is deliberately not touched here: on a partially completed retry it continues to
            // serve queries while the staging replacement is rebuilt.
            DropIndexConcurrently(migrationBuilder, stagingIndexName);
            migrationBuilder.Sql(
                $"""
                CREATE INDEX CONCURRENTLY {stagingIndexName}
                    {definition};
                """,
                suppressTransaction: true
            );

            // The staging build is valid before the existing target is removed, so there is always
            // an applicable index throughout a retry. Renaming is metadata-only.
            DropIndexConcurrently(migrationBuilder, indexName);
            migrationBuilder.Sql(
                $"ALTER INDEX engine.{stagingIndexName} RENAME TO {indexName};",
                suppressTransaction: true
            );
        }

        private static void DropIndexConcurrently(MigrationBuilder migrationBuilder, string indexName)
        {
            migrationBuilder.Sql($"DROP INDEX CONCURRENTLY IF EXISTS engine.{indexName};", suppressTransaction: true);
        }
    }
}
