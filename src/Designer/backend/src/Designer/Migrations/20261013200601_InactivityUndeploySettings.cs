using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class InactivityUndeploySettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "undeploy_on_inactivity",
                schema: "designer",
                table: "app_settings",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean"
            );

            migrationBuilder.AddColumn<int>(
                name: "inactivity_period_days",
                schema: "designer",
                table: "app_settings",
                type: "integer",
                nullable: true
            );

            migrationBuilder.CreateTable(
                name: "org_settings",
                schema: "designer",
                columns: table => new
                {
                    id = table
                        .Column<long>(type: "bigint", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    undeploy_on_inactivity = table.Column<bool>(type: "boolean", nullable: false),
                    inactivity_period_days = table.Column<int>(type: "integer", nullable: false),
                    created = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    created_by = table.Column<string>(type: "character varying", nullable: true),
                    last_modified_by = table.Column<string>(type: "character varying", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("org_settings_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_org_settings_org",
                schema: "designer",
                table: "org_settings",
                column: "org",
                unique: true
            );

            migrationBuilder.Sql("GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE designer.org_settings TO designer;");
            migrationBuilder.Sql("GRANT USAGE,SELECT,UPDATE ON SEQUENCE designer.org_settings_id_seq TO designer;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "org_settings", schema: "designer");

            migrationBuilder.DropColumn(name: "inactivity_period_days", schema: "designer", table: "app_settings");

            migrationBuilder.AlterColumn<bool>(
                name: "undeploy_on_inactivity",
                schema: "designer",
                table: "app_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true
            );
        }
    }
}
