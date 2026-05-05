using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "engine");

            migrationBuilder.CreateTable(
                name: "idempotency_keys",
                schema: "engine",
                columns: table => new
                {
                    idempotency_key = table.Column<string>(type: "text", nullable: false),
                    @namespace = table.Column<string>(name: "namespace", type: "text", nullable: false),
                    request_body_hash = table.Column<byte[]>(type: "bytea", nullable: false),
                    workflow_ids = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_idempotency_keys", x => new { x.idempotency_key, x.@namespace });
                }
            );

            migrationBuilder.CreateTable(
                name: "workflow_collections",
                schema: "engine",
                columns: table => new
                {
                    key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    @namespace = table.Column<string>(
                        name: "namespace",
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: false
                    ),
                    heads = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_workflow_collections", x => new { x.key, x.@namespace });
                }
            );

            migrationBuilder.CreateTable(
                name: "workflows",
                schema: "engine",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operation_id = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false
                    ),
                    idempotency_key = table.Column<string>(type: "text", nullable: false),
                    @namespace = table.Column<string>(
                        name: "namespace",
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: false
                    ),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    start_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    backoff_until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    heartbeat_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    reclaim_count = table.Column<int>(type: "integer", nullable: false),
                    lease_token = table.Column<Guid>(type: "uuid", nullable: true),
                    labels = table.Column<string>(type: "jsonb", nullable: true),
                    collection_key = table.Column<string>(
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: true
                    ),
                    distributed_trace_context = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: true
                    ),
                    engine_trace_context = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: true
                    ),
                    context_json = table.Column<string>(type: "jsonb", nullable: true),
                    cancellation_requested_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: true
                    ),
                    initial_state = table.Column<string>(type: "text", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_workflows", x => x.id);
                }
            );

            migrationBuilder.CreateTable(
                name: "steps",
                schema: "engine",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operation_id = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false
                    ),
                    engine_trace_context = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: true
                    ),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    processing_order = table.Column<int>(type: "integer", nullable: false),
                    requeue_count = table.Column<int>(type: "integer", nullable: false),
                    command_json = table.Column<string>(type: "jsonb", nullable: false),
                    retry_strategy_json = table.Column<string>(type: "jsonb", nullable: true),
                    labels = table.Column<string>(type: "jsonb", nullable: true),
                    error_history = table.Column<string>(type: "jsonb", nullable: true),
                    state_out = table.Column<string>(type: "text", nullable: true),
                    job_id = table.Column<Guid>(type: "uuid", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_steps", x => x.id);
                    table.ForeignKey(
                        name: "fk_steps_workflows_job_id",
                        column: x => x.job_id,
                        principalSchema: "engine",
                        principalTable: "workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateTable(
                name: "workflow_dependency",
                schema: "engine",
                columns: table => new
                {
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    depends_on_workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_workflow_dependency", x => new { x.workflow_id, x.depends_on_workflow_id });
                    table.ForeignKey(
                        name: "fk_workflow_dependency_workflows_depends_on_workflow_id",
                        column: x => x.depends_on_workflow_id,
                        principalSchema: "engine",
                        principalTable: "workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                    table.ForeignKey(
                        name: "fk_workflow_dependency_workflows_workflow_id",
                        column: x => x.workflow_id,
                        principalSchema: "engine",
                        principalTable: "workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateTable(
                name: "workflow_link",
                schema: "engine",
                columns: table => new
                {
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    linked_workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_workflow_link", x => new { x.workflow_id, x.linked_workflow_id });
                    table.ForeignKey(
                        name: "fk_workflow_link_workflows_linked_workflow_id",
                        column: x => x.linked_workflow_id,
                        principalSchema: "engine",
                        principalTable: "workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                    table.ForeignKey(
                        name: "fk_workflow_link_workflows_workflow_id",
                        column: x => x.workflow_id,
                        principalSchema: "engine",
                        principalTable: "workflows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "ix_idempotency_keys_created_at",
                schema: "engine",
                table: "idempotency_keys",
                column: "created_at"
            );

            migrationBuilder.CreateIndex(
                name: "ix_steps_job_id_status",
                schema: "engine",
                table: "steps",
                columns: new[] { "job_id", "status" }
            );

            migrationBuilder
                .CreateIndex(name: "ix_steps_labels", schema: "engine", table: "steps", column: "labels")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.CreateIndex(
                name: "ix_workflow_collections_namespace",
                schema: "engine",
                table: "workflow_collections",
                column: "namespace"
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflow_dependency_depends_on_workflow_id",
                schema: "engine",
                table: "workflow_dependency",
                column: "depends_on_workflow_id"
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflow_link_linked_workflow_id",
                schema: "engine",
                table: "workflow_link",
                column: "linked_workflow_id"
            );

            migrationBuilder
                .CreateIndex(
                    name: "ix_workflows_backoff_until_created_at",
                    schema: "engine",
                    table: "workflows",
                    columns: new[] { "backoff_until", "created_at" },
                    filter: "status IN (0, 2)"
                )
                .Annotation("Npgsql:IndexNullSortOrder", new[] { NullSortOrder.NullsFirst, NullSortOrder.NullsLast });

            migrationBuilder.CreateIndex(
                name: "ix_workflows_collection_key",
                schema: "engine",
                table: "workflows",
                column: "collection_key"
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflows_created_at",
                schema: "engine",
                table: "workflows",
                column: "created_at"
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflows_heartbeat_at",
                schema: "engine",
                table: "workflows",
                column: "heartbeat_at",
                filter: "status = 1"
            );

            migrationBuilder
                .CreateIndex(name: "ix_workflows_labels", schema: "engine", table: "workflows", column: "labels")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.CreateIndex(
                name: "ix_workflows_namespace_status",
                schema: "engine",
                table: "workflows",
                columns: new[] { "namespace", "status" }
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflows_status",
                schema: "engine",
                table: "workflows",
                column: "status"
            );

            migrationBuilder.CreateIndex(
                name: "ix_workflows_updated_at",
                schema: "engine",
                table: "workflows",
                column: "updated_at",
                filter: "status IN (3, 4, 5, 6)"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "idempotency_keys", schema: "engine");

            migrationBuilder.DropTable(name: "steps", schema: "engine");

            migrationBuilder.DropTable(name: "workflow_collections", schema: "engine");

            migrationBuilder.DropTable(name: "workflow_dependency", schema: "engine");

            migrationBuilder.DropTable(name: "workflow_link", schema: "engine");

            migrationBuilder.DropTable(name: "workflows", schema: "engine");
        }
    }
}
