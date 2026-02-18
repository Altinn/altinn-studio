using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class WorkflowDependencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_Workflows_Workflows_ParentWorkflowId", table: "Workflows");

            migrationBuilder.DropIndex(name: "IX_Workflows_ParentWorkflowId", table: "Workflows");

            migrationBuilder.DropColumn(name: "ParentWorkflowId", table: "Workflows");

            migrationBuilder.DropColumn(name: "StartMode", table: "Workflows");

            migrationBuilder.AddColumn<string>(name: "MetadataJson", table: "Workflows", type: "jsonb", nullable: true);

            migrationBuilder.AddColumn<string>(name: "MetadataJson", table: "Steps", type: "jsonb", nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkflowDependency",
                columns: table => new
                {
                    WorkflowId = table.Column<long>(type: "bigint", nullable: false),
                    DependsOnWorkflowId = table.Column<long>(type: "bigint", nullable: false),
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

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowDependency_DependsOnWorkflowId",
                table: "WorkflowDependency",
                column: "DependsOnWorkflowId"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "WorkflowDependency");

            migrationBuilder.DropColumn(name: "MetadataJson", table: "Workflows");

            migrationBuilder.DropColumn(name: "MetadataJson", table: "Steps");

            migrationBuilder.AddColumn<long>(
                name: "ParentWorkflowId",
                table: "Workflows",
                type: "bigint",
                nullable: true
            );

            migrationBuilder.AddColumn<int>(
                name: "StartMode",
                table: "Workflows",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_ParentWorkflowId",
                table: "Workflows",
                column: "ParentWorkflowId"
            );

            migrationBuilder.AddForeignKey(
                name: "FK_Workflows_Workflows_ParentWorkflowId",
                table: "Workflows",
                column: "ParentWorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull
            );
        }
    }
}
