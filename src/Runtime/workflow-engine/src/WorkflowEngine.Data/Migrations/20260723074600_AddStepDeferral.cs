using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStepDeferral : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_workflows_backoff_until_created_at",
                schema: "engine",
                table: "workflows"
            );

            migrationBuilder.AddColumn<int>(
                name: "defer_count",
                schema: "engine",
                table: "steps",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "waiting_since",
                schema: "engine",
                table: "steps",
                type: "timestamp with time zone",
                nullable: true
            );

            migrationBuilder
                .CreateIndex(
                    name: "ix_workflows_backoff_until_created_at",
                    schema: "engine",
                    table: "workflows",
                    columns: new[] { "backoff_until", "created_at" },
                    filter: "status IN (0, 2, 8)"
                )
                .Annotation("Npgsql:IndexNullSortOrder", new[] { NullSortOrder.NullsFirst, NullSortOrder.NullsLast });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_workflows_backoff_until_created_at",
                schema: "engine",
                table: "workflows"
            );

            migrationBuilder.DropColumn(name: "defer_count", schema: "engine", table: "steps");

            migrationBuilder.DropColumn(name: "waiting_since", schema: "engine", table: "steps");

            migrationBuilder
                .CreateIndex(
                    name: "ix_workflows_backoff_until_created_at",
                    schema: "engine",
                    table: "workflows",
                    columns: new[] { "backoff_until", "created_at" },
                    filter: "status IN (0, 2)"
                )
                .Annotation("Npgsql:IndexNullSortOrder", new[] { NullSortOrder.NullsFirst, NullSortOrder.NullsLast });
        }
    }
}
