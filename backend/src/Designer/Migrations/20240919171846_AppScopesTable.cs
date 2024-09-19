using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AppScopesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_scopes",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    app = table.Column<string>(type: "character varying", nullable: false),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    created = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    scopes = table.Column<string>(type: "jsonb", nullable: false),
                    created_by = table.Column<string>(type: "character varying", nullable: true),
                    last_modified_by = table.Column<string>(type: "character varying", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("app_scopes_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_app_scopes_org_app",
                schema: "designer",
                table: "app_scopes",
                columns: new[] { "org", "app" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_scopes",
                schema: "designer");
        }
    }
}
