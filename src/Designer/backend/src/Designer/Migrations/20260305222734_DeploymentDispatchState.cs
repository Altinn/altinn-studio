using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class DeploymentDispatchState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "dispatch_claimed_at",
                schema: "designer",
                table: "builds",
                type: "timestamptz",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "dispatch_token",
                schema: "designer",
                table: "builds",
                type: "text",
                nullable: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "dispatch_claimed_at", schema: "designer", table: "builds");

            migrationBuilder.DropColumn(name: "dispatch_token", schema: "designer", table: "builds");
        }
    }
}
