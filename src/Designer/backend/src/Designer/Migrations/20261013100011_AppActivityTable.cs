using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AppActivityTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_activity",
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
                    environment = table.Column<string>(type: "character varying", nullable: false),
                    app = table.Column<string>(type: "character varying", nullable: false),
                    last_read_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: true),
                    last_write_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: true),
                    latest_window_counts = table.Column<string>(type: "jsonb", nullable: false),
                    latest_window_days = table.Column<int>(type: "integer", nullable: false),
                    observed_since = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    deployed = table.Column<bool>(type: "boolean", nullable: false),
                    first_collected_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    last_collected_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("app_activity_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_app_activity_org_environment_app",
                schema: "designer",
                table: "app_activity",
                columns: new[] { "org", "environment", "app" },
                unique: true
            );

            migrationBuilder.Sql("GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE designer.app_activity TO designer;");
            migrationBuilder.Sql("GRANT USAGE,SELECT,UPDATE ON SEQUENCE designer.app_activity_id_seq TO designer;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "app_activity", schema: "designer");
        }
    }
}
