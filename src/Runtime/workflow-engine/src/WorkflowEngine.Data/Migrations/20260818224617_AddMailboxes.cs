using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailboxes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mailboxes",
                schema: "engine",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    @namespace = table.Column<string>(
                        name: "namespace",
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: false
                    ),
                    idempotency_key = table.Column<string>(
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: false
                    ),
                    collection_key = table.Column<string>(
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: true
                    ),
                    timeout = table.Column<TimeSpan>(type: "interval", nullable: false),
                    deadline = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    next_idx = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    next_seq = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "open"),
                    disposed_reason = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    disposed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mailboxes", x => x.id);
                    table.CheckConstraint(
                        "ck_mailboxes_disposal_is_complete",
                        "(status = 'open' AND disposed_reason IS NULL AND disposed_at IS NULL) OR (status = 'disposed' AND disposed_reason IS NOT NULL AND disposed_at IS NOT NULL)"
                    );
                    table.CheckConstraint("ck_mailboxes_disposed_reason", "disposed_reason IN ('request', 'deadline')");
                    table.CheckConstraint("ck_mailboxes_status", "status IN ('open', 'disposed')");
                }
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailboxes_namespace_collection_key_open",
                schema: "engine",
                table: "mailboxes",
                columns: new[] { "namespace", "collection_key" },
                filter: "status = 'open'"
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailboxes_namespace_idempotency_key",
                schema: "engine",
                table: "mailboxes",
                columns: new[] { "namespace", "idempotency_key" },
                unique: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "mailboxes", schema: "engine");
        }
    }
}
