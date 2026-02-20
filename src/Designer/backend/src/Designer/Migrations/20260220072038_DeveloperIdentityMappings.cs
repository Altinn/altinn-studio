using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class DeveloperIdentityMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "developer_identity_mappings",
                schema: "designer",
                columns: table => new
                {
                    pid_hash = table.Column<string>(type: "character varying", nullable: false),
                    username = table.Column<string>(type: "character varying", nullable: false),
                    created = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("developer_identity_mappings_pkey", x => x.pid_hash);
                });

            migrationBuilder.CreateIndex(
                name: "idx_developer_identity_mappings_username",
                schema: "designer",
                table: "developer_identity_mappings",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "developer_identity_mappings",
                schema: "designer");
        }
    }
}
