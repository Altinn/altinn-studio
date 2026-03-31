using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHeartbeatAndReclaimCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "HeartbeatAt",
                schema: "engine",
                table: "Workflows",
                type: "timestamp with time zone",
                nullable: true
            );

            migrationBuilder.AddColumn<int>(
                name: "ReclaimCount",
                schema: "engine",
                table: "Workflows",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_HeartbeatAt",
                schema: "engine",
                table: "Workflows",
                column: "HeartbeatAt",
                filter: "\"Status\" = 1"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_HeartbeatAt", schema: "engine", table: "Workflows");

            migrationBuilder.DropColumn(name: "HeartbeatAt", schema: "engine", table: "Workflows");

            migrationBuilder.DropColumn(name: "ReclaimCount", schema: "engine", table: "Workflows");
        }
    }
}
