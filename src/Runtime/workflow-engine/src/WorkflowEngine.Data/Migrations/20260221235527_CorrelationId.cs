using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class CorrelationId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(name: "CorrelationId", table: "Steps", type: "uuid", nullable: true);

            migrationBuilder.CreateIndex(name: "IX_Steps_CorrelationId", table: "Steps", column: "CorrelationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Steps_CorrelationId", table: "Steps");

            migrationBuilder.DropColumn(name: "CorrelationId", table: "Steps");
        }
    }
}
