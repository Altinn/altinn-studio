using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AddBuidsTableAndDeploymentsColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "created_by",
                schema: "designer",
                table: "deployments",
                type: "character varying",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "envname",
                schema: "designer",
                table: "deployments",
                type: "character varying",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "internal_build_id",
                schema: "designer",
                table: "deployments",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "builds",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    external_id = table.Column<string>(type: "character varying", nullable: true),
                    status = table.Column<string>(type: "character varying", nullable: true),
                    result = table.Column<string>(type: "character varying", nullable: true),
                    build_type = table.Column<int>(type: "integer", nullable: false),
                    started = table.Column<DateTimeOffset>(type: "timestamptz", nullable: true),
                    finished = table.Column<DateTimeOffset>(type: "timestamptz", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_builds", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_deployments_internal_build_id",
                schema: "designer",
                table: "deployments",
                column: "internal_build_id");

            migrationBuilder.CreateIndex(
                name: "IX_builds_build_type",
                schema: "designer",
                table: "builds",
                column: "build_type");

            migrationBuilder.CreateIndex(
                name: "IX_builds_external_id_build_type",
                schema: "designer",
                table: "builds",
                columns: new[] { "external_id", "build_type" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_deployments_builds_buildid",
                schema: "designer",
                table: "deployments",
                column: "internal_build_id",
                principalSchema: "designer",
                principalTable: "builds",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_deployments_builds_buildid",
                schema: "designer",
                table: "deployments");

            migrationBuilder.DropTable(
                name: "builds",
                schema: "designer");

            migrationBuilder.DropIndex(
                name: "IX_deployments_internal_build_id",
                schema: "designer",
                table: "deployments");

            migrationBuilder.DropColumn(
                name: "created_by",
                schema: "designer",
                table: "deployments");

            migrationBuilder.DropColumn(
                name: "envname",
                schema: "designer",
                table: "deployments");

            migrationBuilder.DropColumn(
                name: "internal_build_id",
                schema: "designer",
                table: "deployments");
        }
    }
}
