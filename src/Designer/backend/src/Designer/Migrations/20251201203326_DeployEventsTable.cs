using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class DeployEventsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "deploy_events",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    deployment_sequenceno = table.Column<long>(type: "BIGSERIAL", nullable: false),
                    event_type = table.Column<string>(type: "character varying", nullable: false),
                    message = table.Column<string>(type: "text", nullable: true),
                    timestamp = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("deploy_events_pkey", x => x.id);
                    table.ForeignKey(
                        name: "fk_deploy_events_deployments",
                        column: x => x.deployment_sequenceno,
                        principalSchema: "designer",
                        principalTable: "deployments",
                        principalColumn: "sequenceno",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_deploy_events_deployment_sequenceno",
                schema: "designer",
                table: "deploy_events",
                column: "deployment_sequenceno");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM designer.deploy_events;");
            migrationBuilder.DropTable(
                name: "deploy_events",
                schema: "designer");
        }
    }
}
