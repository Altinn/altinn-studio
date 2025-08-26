using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class RemovePgDistributedCacheTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("DistributedCache/Drop/01-drop-distributedcache-table.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("DistributedCache/Create/01-setup-distributedcache-table.sql"));
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("DistributedCache/Create/02-setup-grants.sql"));
        }
    }
}
