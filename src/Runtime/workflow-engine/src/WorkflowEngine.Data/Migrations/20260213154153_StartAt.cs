using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class StartAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartAt",
                table: "Steps");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StartAt",
                table: "Workflows",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartAt",
                table: "Workflows");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StartAt",
                table: "Steps",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
