using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCorrelationId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add the column as nullable
            migrationBuilder.AddColumn<Guid>(name: "CorrelationId", table: "Workflows", type: "uuid", nullable: true);

            // 2. Backfill existing rows: copy InstanceGuid into CorrelationId
            migrationBuilder.Sql(
                """UPDATE "Workflows" SET "CorrelationId" = "InstanceGuid" WHERE "CorrelationId" IS NULL"""
            );

            // 3. Make the column non-nullable
            migrationBuilder.AlterColumn<Guid>(
                name: "CorrelationId",
                table: "Workflows",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_CorrelationId",
                table: "Workflows",
                column: "CorrelationId"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_CorrelationId", table: "Workflows");

            migrationBuilder.DropColumn(name: "CorrelationId", table: "Workflows");
        }
    }
}
