using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AppSettingsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_settings",
                schema: "designer",
                columns: table => new
                {
                    id = table
                        .Column<long>(type: "bigint", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    app = table.Column<string>(type: "character varying", nullable: false),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    environment = table.Column<string>(type: "character varying", nullable: true),
                    undeploy_on_inactivity = table.Column<bool>(type: "boolean", nullable: false),
                    created = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    created_by = table.Column<string>(type: "character varying", nullable: true),
                    last_modified_by = table.Column<string>(type: "character varying", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("app_settings_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_app_settings_org_app_environment",
                schema: "designer",
                table: "app_settings",
                columns: new[] { "org", "app", "environment" },
                unique: true,
                filter: "\"environment\" IS NOT NULL"
            );

            migrationBuilder.CreateIndex(
                name: "idx_app_settings_org_app_global",
                schema: "designer",
                table: "app_settings",
                columns: new[] { "org", "app" },
                unique: true,
                filter: "\"environment\" IS NULL"
            );

            migrationBuilder.Sql("GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE designer.app_settings TO designer;");
            migrationBuilder.Sql("GRANT USAGE,SELECT,UPDATE ON SEQUENCE designer.app_settings_id_seq TO designer;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "app_settings", schema: "designer");
        }
    }
}
