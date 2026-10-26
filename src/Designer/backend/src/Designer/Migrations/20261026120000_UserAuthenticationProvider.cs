using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Altinn.Studio.Designer.Migrations;

[DbContext(typeof(DesignerdbContext))]
[Migration("20261026120000_UserAuthenticationProvider")]
public class UserAuthenticationProvider : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) =>
        migrationBuilder.AddColumn<string>(
            name: "authentication_provider",
            schema: "designer",
            table: "user_accounts",
            type: "character varying",
            nullable: true
        );

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropColumn(name: "authentication_provider", schema: "designer", table: "user_accounts");
}
