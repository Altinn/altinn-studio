using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class CollectionsHealthViewIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_workflows_collection_key", schema: "engine", table: "workflows");

            migrationBuilder.DropIndex(
                name: "ix_workflow_collections_namespace",
                schema: "engine",
                table: "workflow_collections"
            );

            migrationBuilder
                .CreateIndex(
                    name: "ix_workflows_collection_key_namespace",
                    schema: "engine",
                    table: "workflows",
                    columns: new[] { "collection_key", "namespace" }
                )
                .Annotation("Npgsql:IndexInclude", new[] { "status", "is_head" });

            migrationBuilder
                .CreateIndex(
                    name: "ix_workflows_namespace_collection_key_failed",
                    schema: "engine",
                    table: "workflows",
                    columns: new[] { "namespace", "collection_key" },
                    filter: "status IN (4, 5, 6)"
                )
                .Annotation("Npgsql:IndexInclude", new[] { "is_head" });

            migrationBuilder.CreateIndex(
                name: "ix_workflow_collections_namespace_key",
                schema: "engine",
                table: "workflow_collections",
                columns: new[] { "namespace", "key" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_workflows_collection_key_namespace",
                schema: "engine",
                table: "workflows"
            );

            migrationBuilder.DropIndex(
                name: "ix_workflows_namespace_collection_key_failed",
                schema: "engine",
                table: "workflows"
            );

            migrationBuilder.DropIndex(
                name: "ix_workflow_collections_namespace_key",
                schema: "engine",
                table: "workflow_collections"
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflows_collection_key",
                schema: "engine",
                table: "workflows",
                column: "collection_key"
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflow_collections_namespace",
                schema: "engine",
                table: "workflow_collections",
                column: "namespace"
            );
        }
    }
}
