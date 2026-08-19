using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailboxCollectionKeyIndexAndReceiverBirthCheck : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_mailboxes_namespace_collection_key_open",
                schema: "engine",
                table: "mailboxes"
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailboxes_namespace_collection_key",
                schema: "engine",
                table: "mailboxes",
                columns: new[] { "namespace", "collection_key", "status" }
            );

            migrationBuilder.AddCheckConstraint(
                name: "ck_mailbox_receivers_birth_is_recorded",
                schema: "engine",
                table: "mailbox_receivers",
                sql: "held_at IS NOT NULL OR released_at IS NOT NULL"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_mailboxes_namespace_collection_key",
                schema: "engine",
                table: "mailboxes"
            );

            migrationBuilder.DropCheckConstraint(
                name: "ck_mailbox_receivers_birth_is_recorded",
                schema: "engine",
                table: "mailbox_receivers"
            );

            migrationBuilder.CreateIndex(
                name: "ix_mailboxes_namespace_collection_key_open",
                schema: "engine",
                table: "mailboxes",
                columns: new[] { "namespace", "collection_key" },
                filter: "status = 'open'"
            );
        }
    }
}
