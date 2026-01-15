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
                name: "workflow_engine_jobs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ActorUserIdOrOrgNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActorLanguage = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    InstanceOrg = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InstanceApp = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InstanceOwnerPartyId = table.Column<int>(type: "integer", nullable: false),
                    InstanceGuid = table.Column<Guid>(type: "uuid", nullable: false),
                    TraceContext = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workflow_engine_jobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "workflow_engine_tasks",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Key = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ProcessingOrder = table.Column<int>(type: "integer", nullable: false),
                    InitialStartTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    StartTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    BackoffUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RequeueCount = table.Column<int>(type: "integer", nullable: false),
                    ActorUserIdOrOrgNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActorLanguage = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    CommandJson = table.Column<string>(type: "jsonb", nullable: false),
                    RetryStrategyJson = table.Column<string>(type: "jsonb", nullable: true),
                    JobId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workflow_engine_tasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_workflow_engine_tasks_workflow_engine_jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "workflow_engine_jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_jobs_CreatedAt",
                table: "workflow_engine_jobs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_jobs_InstanceOrg_InstanceApp_InstanceGuid",
                table: "workflow_engine_jobs",
                columns: new[] { "InstanceOrg", "InstanceApp", "InstanceGuid" });

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_jobs_Key",
                table: "workflow_engine_jobs",
                column: "Key");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_jobs_Status",
                table: "workflow_engine_jobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_tasks_BackoffUntil",
                table: "workflow_engine_tasks",
                column: "BackoffUntil");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_tasks_CreatedAt",
                table: "workflow_engine_tasks",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_tasks_JobId",
                table: "workflow_engine_tasks",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_tasks_Key",
                table: "workflow_engine_tasks",
                column: "Key");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_tasks_ProcessingOrder",
                table: "workflow_engine_tasks",
                column: "ProcessingOrder");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_engine_tasks_Status",
                table: "workflow_engine_tasks",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "workflow_engine_tasks");

            migrationBuilder.DropTable(
                name: "workflow_engine_jobs");
        }
    }
}
