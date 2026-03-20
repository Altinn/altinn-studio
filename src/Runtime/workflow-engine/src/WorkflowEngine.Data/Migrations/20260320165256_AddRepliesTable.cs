using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRepliesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReplyId",
                schema: "engine",
                table: "Steps",
                type: "uuid",
                nullable: true
            );

            migrationBuilder.CreateTable(
                name: "Replies",
                schema: "engine",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StepId = table.Column<Guid>(type: "uuid", nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: true),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "text", nullable: true),
                    PayloadHash = table.Column<byte[]>(type: "bytea", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Replies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Replies_Steps_StepId",
                        column: x => x.StepId,
                        principalSchema: "engine",
                        principalTable: "Steps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Replies_IdempotencyKey",
                schema: "engine",
                table: "Replies",
                column: "IdempotencyKey",
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL"
            );

            migrationBuilder.CreateIndex(
                name: "IX_Replies_StepId",
                schema: "engine",
                table: "Replies",
                column: "StepId",
                unique: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Replies", schema: "engine");

            migrationBuilder.DropColumn(name: "ReplyId", schema: "engine", table: "Steps");
        }
    }
}
