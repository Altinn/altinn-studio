using System;
using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AdminAuditLogTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "admin_audit_log",
                schema: "designer",
                columns: table => new
                {
                    id = table
                        .Column<long>(type: "bigint", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    app = table.Column<string>(type: "character varying", nullable: false),
                    instance_id = table.Column<string>(type: "character varying", nullable: false),
                    action = table.Column<string>(type: "character varying", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    user_name = table.Column<string>(type: "character varying", nullable: false),
                    env = table.Column<string>(type: "character varying", nullable: false),
                    timestamp = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("admin_audit_log_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_admin_audit_log_org_app_timestamp",
                schema: "designer",
                table: "admin_audit_log",
                columns: new[] { "org", "app", "timestamp" }
            );

            migrationBuilder.CreateIndex(
                name: "idx_admin_audit_log_user_timestamp",
                schema: "designer",
                table: "admin_audit_log",
                columns: new[] { "user_id", "timestamp" }
            );

            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("AdminAuditLog/setup-grants.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "admin_audit_log", schema: "designer");
        }
    }
}
