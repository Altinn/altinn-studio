using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AddEventIdToChatMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "event_id",
                schema: "designer",
                table: "chat_messages",
                type: "character varying",
                nullable: true
            );

            migrationBuilder.CreateIndex(
                name: "idx_chat_messages_thread_id_event_id",
                schema: "designer",
                table: "chat_messages",
                columns: new[] { "thread_id", "event_id" },
                unique: true,
                filter: "event_id IS NOT NULL"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_chat_messages_thread_id_event_id",
                schema: "designer",
                table: "chat_messages"
            );

            migrationBuilder.DropColumn(name: "event_id", schema: "designer", table: "chat_messages");
        }
    }
}
