using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class QuartzTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("QuartzTables/tables_postgres.sql"));
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("QuartzTables/setup-grants.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("QuartzTables/drop_tables.sql"));
        }
    }
}
