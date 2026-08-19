using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailboxWaiters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "mailbox_id",
                schema: "engine",
                table: "workflows",
                type: "uuid",
                nullable: true
            );

            migrationBuilder.CreateTable(
                name: "mailbox_waiters",
                schema: "engine",
                columns: table => new
                {
                    mailbox_id = table.Column<Guid>(type: "uuid", nullable: false),
                    seq = table.Column<long>(type: "bigint", nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    released_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mailbox_waiters", x => new { x.mailbox_id, x.seq });
                    table.ForeignKey(
                        name: "fk_mailbox_waiters_mailboxes_mailbox_id",
                        column: x => x.mailbox_id,
                        principalSchema: "engine",
                        principalTable: "mailboxes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailbox_waiters_workflow_id",
                schema: "engine",
                table: "mailbox_waiters",
                column: "workflow_id",
                unique: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "mailbox_waiters", schema: "engine");

            migrationBuilder.DropColumn(name: "mailbox_id", schema: "engine", table: "workflows");
        }
    }
}
