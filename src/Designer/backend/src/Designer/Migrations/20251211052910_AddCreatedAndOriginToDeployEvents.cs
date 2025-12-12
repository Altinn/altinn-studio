using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedAndOriginToDeployEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "created",
                schema: "designer",
                table: "deploy_events",
                type: "timestamptz",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "origin",
                schema: "designer",
                table: "deploy_events",
                type: "character varying",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "created",
                schema: "designer",
                table: "deploy_events");

            migrationBuilder.DropColumn(
                name: "origin",
                schema: "designer",
                table: "deploy_events");
        }
    }
}
