using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateIndices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Steps_BackoffUntil", table: "Steps");

            migrationBuilder.DropIndex(name: "IX_Steps_CreatedAt", table: "Steps");

            migrationBuilder.DropIndex(name: "IX_Steps_JobId", table: "Steps");

            migrationBuilder.DropIndex(name: "IX_Steps_ProcessingOrder", table: "Steps");

            migrationBuilder.DropIndex(name: "IX_Steps_Status", table: "Steps");

            migrationBuilder
                .CreateIndex(
                    name: "IX_Workflows_StartAt_CreatedAt",
                    table: "Workflows",
                    columns: new[] { "StartAt", "CreatedAt" },
                    filter: "\"Status\" IN (0, 2)"
                )
                .Annotation("Npgsql:IndexNullSortOrder", new[] { NullSortOrder.NullsFirst, NullSortOrder.NullsLast });

            migrationBuilder.CreateIndex(
                name: "IX_Steps_JobId_Status",
                table: "Steps",
                columns: new[] { "JobId", "Status" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_StartAt_CreatedAt", table: "Workflows");

            migrationBuilder.DropIndex(name: "IX_Steps_JobId_Status", table: "Steps");

            migrationBuilder.CreateIndex(name: "IX_Steps_BackoffUntil", table: "Steps", column: "BackoffUntil");

            migrationBuilder.CreateIndex(name: "IX_Steps_CreatedAt", table: "Steps", column: "CreatedAt");

            migrationBuilder.CreateIndex(name: "IX_Steps_JobId", table: "Steps", column: "JobId");

            migrationBuilder.CreateIndex(name: "IX_Steps_ProcessingOrder", table: "Steps", column: "ProcessingOrder");

            migrationBuilder.CreateIndex(name: "IX_Steps_Status", table: "Steps", column: "Status");
        }
    }
}
