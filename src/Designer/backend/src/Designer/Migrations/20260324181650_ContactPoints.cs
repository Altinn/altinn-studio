using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class ContactPoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "contact_points",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    name = table.Column<string>(type: "character varying", maxLength: 100, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTimeOffset>(
                        type: "timestamptz",
                        nullable: false,
                        defaultValueSql: "now()"
                    ),
                    environments = table.Column<List<string>>(
                        type: "text[]",
                        nullable: false,
                        defaultValueSql: "'{}'::text[]"
                    ),
                },
                constraints: table =>
                {
                    table.PrimaryKey("contact_points_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateTable(
                name: "contact_methods",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    contact_point_id = table.Column<Guid>(type: "uuid", nullable: false),
                    method_type = table.Column<int>(type: "integer", nullable: false),
                    value = table.Column<string>(type: "character varying", maxLength: 255, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("contact_methods_pkey", x => x.id);
                    table.ForeignKey(
                        name: "fk_contact_methods_contact_point_id",
                        column: x => x.contact_point_id,
                        principalSchema: "designer",
                        principalTable: "contact_points",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_contact_methods_contact_point_id_method_type",
                schema: "designer",
                table: "contact_methods",
                columns: new[] { "contact_point_id", "method_type" },
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "idx_contact_points_org",
                schema: "designer",
                table: "contact_points",
                column: "org"
            );

            migrationBuilder.CreateIndex(
                name: "idx_contact_points_org_active",
                schema: "designer",
                table: "contact_points",
                columns: new[] { "org", "is_active" }
            );

            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("ContactPoints/setup-grants.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "contact_methods", schema: "designer");

            migrationBuilder.DropTable(name: "contact_points", schema: "designer");
        }
    }
}
