﻿using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class DistributedCacheTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("DistributedCache/Up/01-setup-distributedcache-table.sql"));
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("DistributedCache/Up/02-setup-grants.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("DistributedCache/Down/01-drop-distributedcache-table.sql"));
        }
    }
}