using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailbox : Migration
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

            migrationBuilder.CreateTable(
                name: "mailbox_receivers",
                schema: "engine",
                columns: table => new
                {
                    mailbox_id = table.Column<Guid>(type: "uuid", nullable: false),
                    seq = table.Column<long>(type: "bigint", nullable: false),
                    workflow_id = table.Column<Guid>(type: "uuid", nullable: false),
                    held_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    released_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    claimed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mailbox_receivers", x => new { x.mailbox_id, x.seq });
                    table.CheckConstraint(
                        "ck_mailbox_receivers_birth_is_recorded",
                        "held_at IS NOT NULL OR released_at IS NOT NULL"
                    );
                    table.ForeignKey(
                        name: "fk_mailbox_receivers_mailboxes_mailbox_id",
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

            migrationBuilder.CreateIndex(
                name: "ix_mailbox_receivers_workflow_id",
                schema: "engine",
                table: "mailbox_receivers",
                column: "workflow_id",
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailboxes_deadline_open",
                schema: "engine",
                table: "mailboxes",
                column: "deadline",
                filter: "status = 'open'"
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailboxes_disposed_at",
                schema: "engine",
                table: "mailboxes",
                column: "disposed_at",
                filter: "status = 'disposed'"
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailboxes_namespace_collection_key",
                schema: "engine",
                table: "mailboxes",
                columns: new[] { "namespace", "collection_key", "status" }
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
            migrationBuilder.DropTable(name: "mailbox_deliveries", schema: "engine");

            migrationBuilder.DropTable(name: "mailbox_receivers", schema: "engine");

            migrationBuilder.DropTable(name: "mailboxes", schema: "engine");

            migrationBuilder.DropColumn(name: "mailbox_id", schema: "engine", table: "workflows");
        }
    }
}
