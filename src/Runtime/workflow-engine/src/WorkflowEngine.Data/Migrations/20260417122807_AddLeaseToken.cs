using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaseToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nullable with no default — adding this column is a metadata-only ALTER TABLE on PG,
            // avoiding the full-table rewrite that a volatile default (gen_random_uuid()) would force.
            // Existing Processing rows will have LeaseToken = NULL until the next fetch/reclaim,
            // at which point the FetchAndLockWorkflows CTE stamps a fresh uuid.
            migrationBuilder.AddColumn<Guid>(
                name: "LeaseToken",
                schema: "engine",
                table: "Workflows",
                type: "uuid",
                nullable: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "LeaseToken", schema: "engine", table: "Workflows");
        }
    }
}
