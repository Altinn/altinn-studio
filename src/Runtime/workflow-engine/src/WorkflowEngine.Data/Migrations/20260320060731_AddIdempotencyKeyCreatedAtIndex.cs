using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIdempotencyKeyCreatedAtIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_IdempotencyKeys_CreatedAt",
                schema: "engine",
                table: "IdempotencyKeys",
                column: "CreatedAt"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IdempotencyKeys_CreatedAt",
                schema: "engine",
                table: "IdempotencyKeys"
            );
        }
    }
}
