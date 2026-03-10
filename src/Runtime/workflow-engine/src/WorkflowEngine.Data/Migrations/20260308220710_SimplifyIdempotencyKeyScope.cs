using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyIdempotencyKeyScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(name: "PK_idempotency_keys", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "instance_org", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "instance_app", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "instance_owner_party_id", table: "idempotency_keys");

            migrationBuilder.AddPrimaryKey(
                name: "PK_idempotency_keys",
                table: "idempotency_keys",
                columns: new[] { "idempotency_key", "instance_guid" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(name: "PK_idempotency_keys", table: "idempotency_keys");

            migrationBuilder.AddColumn<string>(
                name: "instance_org",
                table: "idempotency_keys",
                type: "text",
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<string>(
                name: "instance_app",
                table: "idempotency_keys",
                type: "text",
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<int>(
                name: "instance_owner_party_id",
                table: "idempotency_keys",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder.AddPrimaryKey(
                name: "PK_idempotency_keys",
                table: "idempotency_keys",
                columns: new[]
                {
                    "idempotency_key",
                    "instance_org",
                    "instance_app",
                    "instance_owner_party_id",
                    "instance_guid",
                }
            );
        }
    }
}
