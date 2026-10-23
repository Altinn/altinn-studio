using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameReceiverEnqueueOutcomeConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A rename, not the drop and add EF generates: RENAME CONSTRAINT is metadata-only, where adding
            // the check back would scan every receiver row under an exclusive lock. Fully transactional, so
            // a re-run after a crash finds the migration either applied and recorded or not applied at all.
            migrationBuilder.Sql(
                """
                ALTER TABLE engine.mailbox_receivers
                    RENAME CONSTRAINT ck_mailbox_receivers_birth_is_recorded
                    TO ck_mailbox_receivers_enqueue_outcome_is_recorded;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE engine.mailbox_receivers
                    RENAME CONSTRAINT ck_mailbox_receivers_enqueue_outcome_is_recorded
                    TO ck_mailbox_receivers_birth_is_recorded;
                """
            );
        }
    }
}
