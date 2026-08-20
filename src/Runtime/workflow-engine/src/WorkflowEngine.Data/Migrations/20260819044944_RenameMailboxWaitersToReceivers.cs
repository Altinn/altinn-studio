using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <summary>Renames <c>mailbox_waiters</c> to <c>mailbox_receivers</c> and gives it <c>held_at</c>.</summary>
    /// <remarks>
    /// Written by hand as a rename: the scaffolder produced a drop-and-recreate, which would take every in-flight
    /// rendezvous with it. The rename follows the table's meaning changing — it now holds a row for <em>every</em>
    /// receiver, not only the ones that parked, and <c>held_at</c> is what separates the two. PostgreSQL keeps
    /// constraint and index names across <c>ALTER TABLE … RENAME TO</c>, so each is renamed explicitly; otherwise
    /// the next scaffolded migration would try to fix the names instead of doing its own job.
    /// </remarks>
    public partial class RenameMailboxWaitersToReceivers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(name: "mailbox_waiters", schema: "engine", newName: "mailbox_receivers");

            migrationBuilder.RenameIndex(
                name: "ix_mailbox_waiters_workflow_id",
                schema: "engine",
                table: "mailbox_receivers",
                newName: "ix_mailbox_receivers_workflow_id"
            );

            migrationBuilder.Sql(
                """
                ALTER TABLE engine.mailbox_receivers
                    RENAME CONSTRAINT pk_mailbox_waiters TO pk_mailbox_receivers;
                """
            );

            migrationBuilder.Sql(
                """
                ALTER TABLE engine.mailbox_receivers
                    RENAME CONSTRAINT fk_mailbox_waiters_mailboxes_mailbox_id
                    TO fk_mailbox_receivers_mailboxes_mailbox_id;
                """
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "held_at",
                schema: "engine",
                table: "mailbox_receivers",
                type: "timestamp with time zone",
                nullable: true
            );

            // Every row that predates this migration describes a receiver that parked, so every one must end up with
            // a stamp. A receiver parks at birth, so its workflow's created_at is its held_at. The COALESCE only
            // covers a registry row whose receiver has since been purged, leaving it deliberately orphaned.
            migrationBuilder.Sql(
                """
                UPDATE engine.mailbox_receivers AS mr
                SET held_at = COALESCE(
                    (SELECT w.created_at FROM engine.workflows AS w WHERE w.id = mr.workflow_id),
                    mr.released_at,
                    now()
                );
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "held_at", schema: "engine", table: "mailbox_receivers");

            migrationBuilder.Sql(
                """
                ALTER TABLE engine.mailbox_receivers
                    RENAME CONSTRAINT fk_mailbox_receivers_mailboxes_mailbox_id
                    TO fk_mailbox_waiters_mailboxes_mailbox_id;
                """
            );

            migrationBuilder.Sql(
                """
                ALTER TABLE engine.mailbox_receivers
                    RENAME CONSTRAINT pk_mailbox_receivers TO pk_mailbox_waiters;
                """
            );

            migrationBuilder.RenameIndex(
                name: "ix_mailbox_receivers_workflow_id",
                schema: "engine",
                table: "mailbox_receivers",
                newName: "ix_mailbox_waiters_workflow_id"
            );

            migrationBuilder.RenameTable(name: "mailbox_receivers", schema: "engine", newName: "mailbox_waiters");
        }
    }
}
