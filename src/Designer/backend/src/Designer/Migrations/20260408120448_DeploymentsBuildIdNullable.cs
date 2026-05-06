using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class DeploymentsBuildIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "buildid",
                table: "deployments",
                schema: "designer",
                nullable: true
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // setting `buildid` to non-nullable will fail if there are deployments will null `buildid`
            // to remove problematic rows:
            // !will result in lost data! `DELETE FROM deployments WHERE buildid IS NULL;`
            migrationBuilder.AlterColumn<string>(
                name: "buildid",
                table: "deployments",
                schema: "designer",
                nullable: false
            );
        }
    }
}
