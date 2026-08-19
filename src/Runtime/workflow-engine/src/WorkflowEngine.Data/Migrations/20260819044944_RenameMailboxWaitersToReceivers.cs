using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <summary>
    /// Renames <c>mailbox_waiters</c> to <c>mailbox_receivers</c> and gives it <c>held_at</c>.
    /// </summary>
    /// <remarks>
    /// Written by hand as a rename. The scaffolder produced a drop-and-recreate, because it sees an
    /// entity disappear and another appear rather than one being renamed — which would take every
    /// in-flight rendezvous with it. Nothing is released, so the data loss would have been survivable,
    /// but a migration that silently discards state is the wrong thing to have in the history whatever
    /// the data is worth today.
    /// <para>
    /// The rename follows the table's meaning changing: it now holds a row for <em>every</em> receiver,
    /// not only the ones that parked, because the position is what the executor reads its delivery by.
    /// <c>held_at</c> is what separates the two — non-null for a receiver that parked, null for one born
    /// runnable — and it is the guard that keeps the wake-to-claim histogram measuring a wake.
    /// </para>
    /// <para>
    /// PostgreSQL keeps constraint and index names across <c>ALTER TABLE … RENAME TO</c>, so each is
    /// renamed explicitly; leaving them would work but would put names EF does not expect in the
    /// database, and the next scaffolded migration would try to fix that instead of doing its own job.
    /// </para>
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

            // Every row that predates this migration describes a receiver that parked — that was the only
            // kind the enqueue flush registered — so every one of them must end up with a stamp. The
            // receiver's own workflow row carries the instant exactly: a receiver parks at birth, so its
            // created_at is its held_at. The COALESCE only covers a registry row whose receiver has since
            // been purged by the workflow retention sweep, which leaves the row deliberately orphaned;
            // there the release instant is the closest thing recorded, and now() is the last resort. What
            // must be true of every row is that the stamp is not null, and that holds either way.
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
