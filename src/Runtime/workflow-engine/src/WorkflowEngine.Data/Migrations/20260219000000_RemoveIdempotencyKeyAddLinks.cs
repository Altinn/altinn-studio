using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIdempotencyKeyAddLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_IdempotencyKey", table: "Workflows");

            migrationBuilder.DropIndex(name: "IX_Steps_IdempotencyKey", table: "Steps");

            migrationBuilder.DropColumn(name: "IdempotencyKey", table: "Workflows");

            migrationBuilder.DropColumn(name: "IdempotencyKey", table: "Steps");

            migrationBuilder.CreateTable(
                name: "WorkflowLink",
                columns: table => new
                {
                    WorkflowId = table.Column<long>(type: "bigint", nullable: false),
                    LinkedWorkflowId = table.Column<long>(type: "bigint", nullable: false),
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
                name: "IX_WorkflowLink_LinkedWorkflowId",
                table: "WorkflowLink",
                column: "LinkedWorkflowId"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "WorkflowLink");

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "Workflows",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "Steps",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_IdempotencyKey",
                table: "Workflows",
                column: "IdempotencyKey"
            );

            migrationBuilder.CreateIndex(name: "IX_Steps_IdempotencyKey", table: "Steps", column: "IdempotencyKey");
        }
    }
}
