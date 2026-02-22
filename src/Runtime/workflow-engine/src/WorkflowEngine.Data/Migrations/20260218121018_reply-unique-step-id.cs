using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class replyuniquestepid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Replies_StepId", table: "Replies");

            migrationBuilder.CreateIndex(name: "IX_Replies_StepId", table: "Replies", column: "StepId", unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Replies_StepId", table: "Replies");

            migrationBuilder.CreateIndex(name: "IX_Replies_StepId", table: "Replies", column: "StepId");
        }
    }
}
