using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class InitMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // initial sql used in yuniql migration are idempotent so it is safe to execute them as initial ef-core migration
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("InitialSqlScripts/01-setup-tables.sql"));
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("InitialSqlScripts/02-setup-deployments.sql"));
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("InitialSqlScripts/03-setup-releases.sql"));
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("InitialSqlScripts/04-setup-grants.sql"));
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("InitialSqlScripts/05-setup-index.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Disable down migration
        }
    }
}
