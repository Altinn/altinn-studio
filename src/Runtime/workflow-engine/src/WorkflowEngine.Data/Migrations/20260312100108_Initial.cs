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
            migrationBuilder.CreateTable(
                name: "idempotency_keys",
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
                    table.PrimaryKey("PK_idempotency_keys", x => new { x.idempotency_key, x.@namespace });
                }
            );

            migrationBuilder.CreateTable(
                name: "Workflows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OperationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "text", nullable: false),
                    TenantId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StartAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    BackoffUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LabelsJson = table.Column<string>(type: "jsonb", nullable: true),
                    ContextJson = table.Column<string>(type: "jsonb", nullable: true),
                    CorrelationId = table.Column<Guid>(type: "uuid", nullable: true),
                    TraceContext = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MetadataJson = table.Column<string>(type: "jsonb", nullable: true),
                    EngineTraceId = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: true
                    ),
                    InitialState = table.Column<string>(type: "text", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workflows", x => x.Id);
                }
            );

            migrationBuilder.CreateTable(
                name: "Steps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OperationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ProcessingOrder = table.Column<int>(type: "integer", nullable: false),
                    RequeueCount = table.Column<int>(type: "integer", nullable: false),
                    CommandJson = table.Column<string>(type: "jsonb", nullable: false),
                    RetryStrategyJson = table.Column<string>(type: "jsonb", nullable: true),
                    MetadataJson = table.Column<string>(type: "jsonb", nullable: true),
                    StateOut = table.Column<string>(type: "text", nullable: true),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Steps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Steps_Workflows_JobId",
                        column: x => x.JobId,
                        principalTable: "Workflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateTable(
                name: "WorkflowDependency",
                columns: table => new
                {
                    WorkflowId = table.Column<Guid>(type: "uuid", nullable: false),
                    DependsOnWorkflowId = table.Column<Guid>(type: "uuid", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowDependency", x => new { x.WorkflowId, x.DependsOnWorkflowId });
                    table.ForeignKey(
                        name: "FK_WorkflowDependency_Workflows_DependsOnWorkflowId",
                        column: x => x.DependsOnWorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                    table.ForeignKey(
                        name: "FK_WorkflowDependency_Workflows_WorkflowId",
                        column: x => x.WorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateTable(
                name: "WorkflowLink",
                columns: table => new
                {
                    WorkflowId = table.Column<Guid>(type: "uuid", nullable: false),
                    LinkedWorkflowId = table.Column<Guid>(type: "uuid", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowLink", x => new { x.WorkflowId, x.LinkedWorkflowId });
                    table.ForeignKey(
                        name: "FK_WorkflowLink_Workflows_LinkedWorkflowId",
                        column: x => x.LinkedWorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                    table.ForeignKey(
                        name: "FK_WorkflowLink_Workflows_WorkflowId",
                        column: x => x.WorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Steps_JobId_Status",
                table: "Steps",
                columns: new[] { "JobId", "Status" }
            );

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowDependency_DependsOnWorkflowId",
                table: "WorkflowDependency",
                column: "DependsOnWorkflowId"
            );

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowLink_LinkedWorkflowId",
                table: "WorkflowLink",
                column: "LinkedWorkflowId"
            );

            migrationBuilder
                .CreateIndex(
                    name: "IX_Workflows_BackoffUntil_CreatedAt",
                    table: "Workflows",
                    columns: new[] { "BackoffUntil", "CreatedAt" },
                    filter: "\"Status\" IN (0, 2)"
                )
                .Annotation("Npgsql:IndexNullSortOrder", new[] { NullSortOrder.NullsFirst, NullSortOrder.NullsLast });

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_CorrelationId",
                table: "Workflows",
                column: "CorrelationId"
            );

            migrationBuilder.CreateIndex(name: "IX_Workflows_CreatedAt", table: "Workflows", column: "CreatedAt");

            migrationBuilder
                .CreateIndex(name: "IX_Workflows_LabelsJson", table: "Workflows", column: "LabelsJson")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.CreateIndex(name: "IX_Workflows_Status", table: "Workflows", column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_TenantId_Status",
                table: "Workflows",
                columns: new[] { "TenantId", "Status" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "idempotency_keys");

            migrationBuilder.DropTable(name: "Steps");

            migrationBuilder.DropTable(name: "WorkflowDependency");

            migrationBuilder.DropTable(name: "WorkflowLink");

            migrationBuilder.DropTable(name: "Workflows");
        }
    }
}
