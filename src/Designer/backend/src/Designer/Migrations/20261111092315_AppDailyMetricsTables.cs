using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AppDailyMetricsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_daily_metrics",
                schema: "designer",
                columns: table => new
                {
                    id = table
                        .Column<long>(type: "bigint", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    metric_date = table.Column<DateOnly>(type: "date", nullable: false),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    environment = table.Column<string>(type: "character varying", nullable: false),
                    app = table.Column<string>(type: "character varying", nullable: false),
                    instances_created = table.Column<int>(type: "integer", nullable: false),
                    instances_completed = table.Column<int>(type: "integer", nullable: false),
                    seconds_to_complete_p50 = table.Column<int>(type: "integer", nullable: true),
                    open_instances = table.Column<int>(type: "integer", nullable: true),
                    open_over_90_days = table.Column<int>(type: "integer", nullable: true),
                    unconfirmed_over_90_days = table.Column<int>(type: "integer", nullable: true),
                    computed_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("app_daily_metrics_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateTable(
                name: "app_daily_task_metrics",
                schema: "designer",
                columns: table => new
                {
                    id = table
                        .Column<long>(type: "bigint", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn
                        ),
                    metric_date = table.Column<DateOnly>(type: "date", nullable: false),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    environment = table.Column<string>(type: "character varying", nullable: false),
                    app = table.Column<string>(type: "character varying", nullable: false),
                    task_id = table.Column<string>(type: "character varying", nullable: false),
                    open_instances = table.Column<int>(type: "integer", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("app_daily_task_metrics_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_app_daily_metrics_date_org_environment_app",
                schema: "designer",
                table: "app_daily_metrics",
                columns: new[] { "metric_date", "org", "environment", "app" },
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "idx_app_daily_metrics_org_environment_date",
                schema: "designer",
                table: "app_daily_metrics",
                columns: new[] { "org", "environment", "metric_date" }
            );

            migrationBuilder.CreateIndex(
                name: "idx_app_daily_task_metrics_date_org_environment_app_task",
                schema: "designer",
                table: "app_daily_task_metrics",
                columns: new[] { "metric_date", "org", "environment", "app", "task_id" },
                unique: true
            );

            migrationBuilder.Sql("GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE designer.app_daily_metrics TO designer;");
            migrationBuilder.Sql(
                "GRANT USAGE,SELECT,UPDATE ON SEQUENCE designer.app_daily_metrics_id_seq TO designer;"
            );
            migrationBuilder.Sql(
                "GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE designer.app_daily_task_metrics TO designer;"
            );
            migrationBuilder.Sql(
                "GRANT USAGE,SELECT,UPDATE ON SEQUENCE designer.app_daily_task_metrics_id_seq TO designer;"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "app_daily_metrics", schema: "designer");

            migrationBuilder.DropTable(name: "app_daily_task_metrics", schema: "designer");
        }
    }
}
