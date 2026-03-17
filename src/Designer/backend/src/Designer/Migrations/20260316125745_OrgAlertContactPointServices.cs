using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class OrgAlertContactPointServices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "services",
                schema: "designer",
                table: "org_alert_slack_channels",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb"
            );

            migrationBuilder.AddColumn<string>(
                name: "services",
                schema: "designer",
                table: "org_alert_persons",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "services", schema: "designer", table: "org_alert_slack_channels");

            migrationBuilder.DropColumn(name: "services", schema: "designer", table: "org_alert_persons");
        }
    }
}
