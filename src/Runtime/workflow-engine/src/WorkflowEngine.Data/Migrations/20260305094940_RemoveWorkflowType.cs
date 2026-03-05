using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveWorkflowType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_InstanceGuid_Type_Status", table: "Workflows");

            migrationBuilder.DropColumn(name: "Type", table: "Workflows");

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_InstanceGuid_Status",
                table: "Workflows",
                columns: new[] { "InstanceGuid", "Status" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_InstanceGuid_Status", table: "Workflows");

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Workflows",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_InstanceGuid_Type_Status",
                table: "Workflows",
                columns: new[] { "InstanceGuid", "Type", "Status" }
            );
        }
    }
}
