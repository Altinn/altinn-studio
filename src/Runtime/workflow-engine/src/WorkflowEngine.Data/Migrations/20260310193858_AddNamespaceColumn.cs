using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNamespaceColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(name: "PK_idempotency_keys", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "instance_guid", table: "idempotency_keys");

            migrationBuilder.AddColumn<string>(
                name: "Namespace",
                table: "Workflows",
                type: "text",
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<string>(
                name: "namespace",
                table: "idempotency_keys",
                type: "text",
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddPrimaryKey(
                name: "PK_idempotency_keys",
                table: "idempotency_keys",
                columns: new[] { "idempotency_key", "namespace" }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_Namespace_Status",
                table: "Workflows",
                columns: new[] { "Namespace", "Status" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_Namespace_Status", table: "Workflows");

            migrationBuilder.DropPrimaryKey(name: "PK_idempotency_keys", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "Namespace", table: "Workflows");

            migrationBuilder.DropColumn(name: "namespace", table: "idempotency_keys");

            migrationBuilder.AddColumn<Guid>(
                name: "instance_guid",
                table: "idempotency_keys",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000")
            );

            migrationBuilder.AddPrimaryKey(
                name: "PK_idempotency_keys",
                table: "idempotency_keys",
                columns: new[] { "idempotency_key", "instance_guid" }
            );
        }
    }
}
