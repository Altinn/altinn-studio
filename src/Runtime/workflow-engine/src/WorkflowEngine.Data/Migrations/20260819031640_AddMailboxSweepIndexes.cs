using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMailboxSweepIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "ix_mailboxes_deadline_open", schema: "engine", table: "mailboxes");

            migrationBuilder.DropIndex(name: "ix_mailboxes_disposed_at", schema: "engine", table: "mailboxes");
        }
    }
}
