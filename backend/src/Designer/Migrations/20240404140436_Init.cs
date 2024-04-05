using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "designer");

            migrationBuilder.CreateTable(
                name: "deployments",
                schema: "designer",
                columns: table => new
                {
                    sequenceno = table.Column<long>(type: "BIGSERIAL", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    buildid = table.Column<string>(type: "character varying", nullable: true),
                    tagname = table.Column<string>(type: "character varying", nullable: true),
                    org = table.Column<string>(type: "character varying", nullable: true),
                    app = table.Column<string>(type: "character varying", nullable: true),
                    buildresult = table.Column<string>(type: "character varying", nullable: true),
                    created = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    entity = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("deployments_pkey", x => x.sequenceno);
                });

            migrationBuilder.CreateTable(
                name: "releases",
                schema: "designer",
                columns: table => new
                {
                    sequenceno = table.Column<long>(type: "BIGSERIAL", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    buildid = table.Column<string>(type: "character varying", nullable: true),
                    tagname = table.Column<string>(type: "character varying", nullable: true),
                    org = table.Column<string>(type: "character varying", nullable: true),
                    app = table.Column<string>(type: "character varying", nullable: true),
                    buildstatus = table.Column<string>(type: "character varying", nullable: true),
                    buildresult = table.Column<string>(type: "character varying", nullable: true),
                    created = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    entity = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("releases_pkey", x => x.sequenceno);
                });

            migrationBuilder.CreateIndex(
                name: "idx_deployments_org_app",
                schema: "designer",
                table: "deployments",
                columns: new[] { "org", "app" });

            migrationBuilder.CreateIndex(
                name: "idx_releases_org_app",
                schema: "designer",
                table: "releases",
                columns: new[] { "org", "app" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "deployments",
                schema: "designer");

            migrationBuilder.DropTable(
                name: "releases",
                schema: "designer");
        }
    }
}
