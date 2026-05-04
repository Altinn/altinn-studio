using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowCollections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_CorrelationId", schema: "engine", table: "Workflows");

            migrationBuilder.DropColumn(name: "CorrelationId", schema: "engine", table: "Workflows");

            migrationBuilder.AddColumn<string>(
                name: "CollectionKey",
                schema: "engine",
                table: "Workflows",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true
            );

            migrationBuilder.CreateTable(
                name: "WorkflowCollections",
                schema: "engine",
                columns: table => new
                {
                    Key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Namespace = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Heads = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowCollections", x => new { x.Key, x.Namespace });
                }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_CollectionKey",
                schema: "engine",
                table: "Workflows",
                column: "CollectionKey"
            );

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowCollections_Namespace",
                schema: "engine",
                table: "WorkflowCollections",
                column: "Namespace"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "WorkflowCollections", schema: "engine");

            migrationBuilder.DropIndex(name: "IX_Workflows_CollectionKey", schema: "engine", table: "Workflows");

            migrationBuilder.DropColumn(name: "CollectionKey", schema: "engine", table: "Workflows");

            migrationBuilder.AddColumn<Guid>(
                name: "CorrelationId",
                schema: "engine",
                table: "Workflows",
                type: "uuid",
                nullable: true
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_CorrelationId",
                schema: "engine",
                table: "Workflows",
                column: "CorrelationId"
            );
        }
    }
}
