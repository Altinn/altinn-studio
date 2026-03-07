using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoveBackoffToWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_StartAt_CreatedAt", table: "Workflows");

            migrationBuilder.DropColumn(name: "BackoffUntil", table: "Steps");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "BackoffUntil",
                table: "Workflows",
                type: "timestamp with time zone",
                nullable: true
            );

            migrationBuilder
                .CreateIndex(
                    name: "IX_Workflows_BackoffUntil_CreatedAt",
                    table: "Workflows",
                    columns: new[] { "BackoffUntil", "CreatedAt" },
                    filter: "\"Status\" IN (0, 2)"
                )
                .Annotation("Npgsql:IndexNullSortOrder", new[] { NullSortOrder.NullsFirst, NullSortOrder.NullsLast });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_BackoffUntil_CreatedAt", table: "Workflows");

            migrationBuilder.DropColumn(name: "BackoffUntil", table: "Workflows");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "BackoffUntil",
                table: "Steps",
                type: "timestamp with time zone",
                nullable: true
            );

            migrationBuilder
                .CreateIndex(
                    name: "IX_Workflows_StartAt_CreatedAt",
                    table: "Workflows",
                    columns: new[] { "StartAt", "CreatedAt" },
                    filter: "\"Status\" IN (0, 2)"
                )
                .Annotation("Npgsql:IndexNullSortOrder", new[] { NullSortOrder.NullsFirst, NullSortOrder.NullsLast });
        }
    }
}
