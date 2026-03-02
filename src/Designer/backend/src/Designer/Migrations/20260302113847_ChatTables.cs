using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class ChatTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_threads",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    app = table.Column<string>(type: "character varying", nullable: false),
                    created_by = table.Column<string>(type: "character varying", nullable: false),
                    title = table.Column<string>(type: "character varying", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_threads", x => x.id);
                }
            );

            migrationBuilder.CreateTable(
                name: "chat_messages",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    thread_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    content = table.Column<string>(type: "character varying", nullable: false),
                    action_mode = table.Column<int>(type: "integer", nullable: false),
                    files_changed = table.Column<List<string>>(type: "jsonb", nullable: false),
                    attachment_file_names = table.Column<List<string>>(type: "jsonb", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_chat_messages_chat_threads_thread_id",
                        column: x => x.thread_id,
                        principalSchema: "designer",
                        principalTable: "chat_threads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_chat_messages_thread_id",
                schema: "designer",
                table: "chat_messages",
                column: "thread_id"
            );

            migrationBuilder.CreateIndex(
                name: "idx_chat_threads_org_app_created_by",
                schema: "designer",
                table: "chat_threads",
                columns: new[] { "org", "app", "created_by" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "chat_messages", schema: "designer");

            migrationBuilder.DropTable(name: "chat_threads", schema: "designer");
        }
    }
}
