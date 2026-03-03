using System;
using Microsoft.EntityFrameworkCore.Migrations;

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
                    instance_org = table.Column<string>(type: "text", nullable: false),
                    instance_app = table.Column<string>(type: "text", nullable: false),
                    instance_owner_party_id = table.Column<int>(type: "integer", nullable: false),
                    instance_guid = table.Column<Guid>(type: "uuid", nullable: false),
                    request_body_hash = table.Column<byte[]>(type: "bytea", nullable: false),
                    workflow_ids = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_idempotency_keys",
                        x => new
                        {
                            x.idempotency_key,
                            x.instance_org,
                            x.instance_app,
                            x.instance_owner_party_id,
                            x.instance_guid,
                        }
                    );
                }
            );

            migrationBuilder.CreateTable(
                name: "Workflows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OperationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IdempotencyKey = table.Column<string>(type: "text", nullable: false),
                    InstanceLockKey = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: true
                    ),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StartAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ActorUserIdOrOrgNumber = table.Column<string>(
                        type: "character varying(50)",
                        maxLength: 50,
                        nullable: false
                    ),
                    ActorLanguage = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    InstanceOrg = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InstanceApp = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InstanceOwnerPartyId = table.Column<int>(type: "integer", nullable: false),
                    InstanceGuid = table.Column<Guid>(type: "uuid", nullable: false),
                    TraceContext = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MetadataJson = table.Column<string>(type: "jsonb", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
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
                    BackoffUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RequeueCount = table.Column<int>(type: "integer", nullable: false),
                    ActorUserIdOrOrgNumber = table.Column<string>(
                        type: "character varying(50)",
                        maxLength: 50,
                        nullable: false
                    ),
                    ActorLanguage = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
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

            migrationBuilder.CreateIndex(name: "IX_Steps_BackoffUntil", table: "Steps", column: "BackoffUntil");

            migrationBuilder.CreateIndex(name: "IX_Steps_CreatedAt", table: "Steps", column: "CreatedAt");

            migrationBuilder.CreateIndex(name: "IX_Steps_JobId", table: "Steps", column: "JobId");

            migrationBuilder.CreateIndex(name: "IX_Steps_ProcessingOrder", table: "Steps", column: "ProcessingOrder");

            migrationBuilder.CreateIndex(name: "IX_Steps_Status", table: "Steps", column: "Status");

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

            migrationBuilder.CreateIndex(name: "IX_Workflows_CreatedAt", table: "Workflows", column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_InstanceGuid_Type_Status",
                table: "Workflows",
                columns: new[] { "InstanceGuid", "Type", "Status" }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_InstanceOrg_InstanceApp_InstanceGuid",
                table: "Workflows",
                columns: new[] { "InstanceOrg", "InstanceApp", "InstanceGuid" }
            );

            migrationBuilder.CreateIndex(name: "IX_Workflows_Status", table: "Workflows", column: "Status");
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
