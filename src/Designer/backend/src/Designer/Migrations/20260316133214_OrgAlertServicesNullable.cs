using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class OrgAlertServicesNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "services",
                schema: "designer",
                table: "org_alert_slack_channels",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldDefaultValueSql: "'[]'::jsonb"
            );

            migrationBuilder.AlterColumn<string>(
                name: "services",
                schema: "designer",
                table: "org_alert_persons",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldDefaultValueSql: "'[]'::jsonb"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "services",
                schema: "designer",
                table: "org_alert_slack_channels",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb",
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true
            );

            migrationBuilder.AlterColumn<string>(
                name: "services",
                schema: "designer",
                table: "org_alert_persons",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb",
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldNullable: true
            );
        }
    }
}
