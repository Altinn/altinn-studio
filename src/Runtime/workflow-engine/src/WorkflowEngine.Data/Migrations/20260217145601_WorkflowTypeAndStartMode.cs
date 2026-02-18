using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class WorkflowTypeAndStartMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.AddColumn<int>(
                name: "Type",
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_Workflows_Workflows_ParentWorkflowId", table: "Workflows");

            migrationBuilder.DropIndex(name: "IX_Workflows_ParentWorkflowId", table: "Workflows");

            migrationBuilder.DropColumn(name: "ParentWorkflowId", table: "Workflows");

            migrationBuilder.DropColumn(name: "StartMode", table: "Workflows");

            migrationBuilder.DropColumn(name: "Type", table: "Workflows");
        }
    }
}
