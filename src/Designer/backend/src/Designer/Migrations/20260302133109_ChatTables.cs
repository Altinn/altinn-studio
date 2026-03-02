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
            migrationBuilder.AlterColumn<List<string>>(
                name: "files_changed",
                schema: "designer",
                table: "chat_messages",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(List<string>),
                oldType: "jsonb"
            );

            migrationBuilder.AlterColumn<List<string>>(
                name: "attachment_file_names",
                schema: "designer",
                table: "chat_messages",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(List<string>),
                oldType: "jsonb"
            );

            migrationBuilder.AlterColumn<int>(
                name: "action_mode",
                schema: "designer",
                table: "chat_messages",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<List<string>>(
                name: "files_changed",
                schema: "designer",
                table: "chat_messages",
                type: "jsonb",
                nullable: false,
                oldClrType: typeof(List<string>),
                oldType: "jsonb",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<List<string>>(
                name: "attachment_file_names",
                schema: "designer",
                table: "chat_messages",
                type: "jsonb",
                nullable: false,
                oldClrType: typeof(List<string>),
                oldType: "jsonb",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<int>(
                name: "action_mode",
                schema: "designer",
                table: "chat_messages",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true
            );
        }
    }
}
