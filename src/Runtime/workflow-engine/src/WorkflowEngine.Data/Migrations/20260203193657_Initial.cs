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
                name: "Workflows",
                columns: table => new
                {
                    Id = table
                        .Column<long>(type: "bigint", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    IdempotencyKey = table.Column<string>(
                        type: "character varying(500)",
                        maxLength: 500,
                        nullable: false
                    ),
                    InstanceLockKey = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false,
                        defaultValueSql: "NOW()"
                    ),
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
                    TraceContext = table.Column<string>(type: "text", nullable: true),
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
                    Id = table
                        .Column<long>(type: "bigint", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    IdempotencyKey = table.Column<string>(
                        type: "character varying(500)",
                        maxLength: 500,
                        nullable: false
                    ),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false,
                        defaultValueSql: "NOW()"
                    ),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ProcessingOrder = table.Column<int>(type: "integer", nullable: false),
                    FirstSeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StartAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
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
                    JobId = table.Column<long>(type: "bigint", nullable: false),
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

            migrationBuilder.CreateIndex(name: "IX_Steps_BackoffUntil", table: "Steps", column: "BackoffUntil");

            migrationBuilder.CreateIndex(name: "IX_Steps_CreatedAt", table: "Steps", column: "CreatedAt");

            migrationBuilder.CreateIndex(name: "IX_Steps_IdempotencyKey", table: "Steps", column: "IdempotencyKey");

            migrationBuilder.CreateIndex(name: "IX_Steps_JobId", table: "Steps", column: "JobId");

            migrationBuilder.CreateIndex(name: "IX_Steps_ProcessingOrder", table: "Steps", column: "ProcessingOrder");

            migrationBuilder.CreateIndex(name: "IX_Steps_Status", table: "Steps", column: "Status");

            migrationBuilder.CreateIndex(name: "IX_Workflows_CreatedAt", table: "Workflows", column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_IdempotencyKey",
                table: "Workflows",
                column: "IdempotencyKey"
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
            migrationBuilder.DropTable(name: "Steps");

            migrationBuilder.DropTable(name: "Workflows");
        }
    }
}
