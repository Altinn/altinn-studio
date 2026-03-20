using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLastErrorRenameErrorHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "LastError", schema: "engine", table: "Steps");

            migrationBuilder.RenameColumn(
                name: "ErrorHistoryJson",
                schema: "engine",
                table: "Steps",
                newName: "ErrorHistory"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ErrorHistory",
                schema: "engine",
                table: "Steps",
                newName: "ErrorHistoryJson"
            );

            migrationBuilder.AddColumn<string>(
                name: "LastError",
                schema: "engine",
                table: "Steps",
                type: "text",
                nullable: true
            );
        }
    }
}
