using System;
using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class OrgAlertContactPoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "org_alert_persons",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    name = table.Column<string>(type: "character varying", nullable: false),
                    email = table.Column<string>(type: "character varying", nullable: true),
                    email_severity = table.Column<int>(type: "integer", nullable: false),
                    phone = table.Column<string>(type: "character varying", nullable: true),
                    sms_severity = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("org_alert_persons_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateTable(
                name: "org_alert_slack_channels",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    channel_name = table.Column<string>(type: "character varying", nullable: false),
                    slack_id = table.Column<string>(type: "character varying", nullable: false),
                    severity = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("org_alert_slack_channels_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_org_alert_persons_org",
                schema: "designer",
                table: "org_alert_persons",
                column: "org"
            );

            migrationBuilder.CreateIndex(
                name: "idx_org_alert_persons_org_active",
                schema: "designer",
                table: "org_alert_persons",
                columns: new[] { "org", "is_active" }
            );

            migrationBuilder.CreateIndex(
                name: "idx_org_alert_slack_channels_org",
                schema: "designer",
                table: "org_alert_slack_channels",
                column: "org"
            );

            migrationBuilder.CreateIndex(
                name: "idx_org_alert_slack_channels_unique_slack_id_per_org",
                schema: "designer",
                table: "org_alert_slack_channels",
                columns: new[] { "org", "slack_id" },
                unique: true
            );

            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("OrgAlertContactPoints/setup-grants.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "org_alert_persons", schema: "designer");

            migrationBuilder.DropTable(name: "org_alert_slack_channels", schema: "designer");
        }
    }
}
