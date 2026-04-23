using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AddAllowAppChangesAndSourcesToChatMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "action_mode", schema: "designer", table: "chat_messages");

            migrationBuilder.AddColumn<bool>(
                name: "allow_app_changes",
                schema: "designer",
                table: "chat_messages",
                type: "boolean",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "sources",
                schema: "designer",
                table: "chat_messages",
                type: "jsonb",
                nullable: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "allow_app_changes", schema: "designer", table: "chat_messages");

            migrationBuilder.DropColumn(name: "sources", schema: "designer", table: "chat_messages");

            migrationBuilder.AddColumn<int>(
                name: "action_mode",
                schema: "designer",
                table: "chat_messages",
                type: "integer",
                nullable: true
            );
        }
    }
}
