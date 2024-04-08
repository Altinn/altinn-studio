using Altinn.Studio.Designer.Migrations.InitialSqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // initial sql used in yuniql migration are idempotent so it is safe to execute them as initial ef-core migration
            migrationBuilder.Sql(InitialScriptsReadHelper.ReadInitialSqlScript("01-setup-tables.sql"));
            migrationBuilder.Sql(InitialScriptsReadHelper.ReadInitialSqlScript("02-setup-deployments.sql"));
            migrationBuilder.Sql(InitialScriptsReadHelper.ReadInitialSqlScript("03-setup-releases.sql"));
            migrationBuilder.Sql(InitialScriptsReadHelper.ReadInitialSqlScript("04-setup-grants.sql"));
            migrationBuilder.Sql(InitialScriptsReadHelper.ReadInitialSqlScript("05-setup-index.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Disable down migration
        }
    }
}
