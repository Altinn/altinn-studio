using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailboxDeliveries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mailbox_deliveries",
                schema: "engine",
                columns: table => new
                {
                    mailbox_id = table.Column<Guid>(type: "uuid", nullable: false),
                    idx = table.Column<long>(type: "bigint", nullable: false),
                    idempotency_key = table.Column<string>(
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: false
                    ),
                    payload = table.Column<string>(type: "text", nullable: false),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mailbox_deliveries", x => new { x.mailbox_id, x.idx });
                    table.ForeignKey(
                        name: "fk_mailbox_deliveries_mailboxes_mailbox_id",
                        column: x => x.mailbox_id,
                        principalSchema: "engine",
                        principalTable: "mailboxes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailbox_deliveries_mailbox_id_idempotency_key",
                schema: "engine",
                table: "mailbox_deliveries",
                columns: new[] { "mailbox_id", "idempotency_key" },
                unique: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "mailbox_deliveries", schema: "engine");
        }
    }
}
