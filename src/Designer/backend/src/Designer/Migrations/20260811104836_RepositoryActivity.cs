using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class RepositoryActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "repository_activity",
                schema: "designer",
                columns: table => new
                {
                    developer = table.Column<string>(type: "character varying", nullable: false),
                    org = table.Column<string>(type: "character varying", nullable: false),
                    repository = table.Column<string>(type: "character varying", nullable: false),
                    last_accessed_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    cleanup_pending = table.Column<bool>(type: "boolean", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "repository_activity_pkey",
                        x => new
                        {
                            x.developer,
                            x.org,
                            x.repository,
                        }
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_repository_activity_last_accessed_at",
                schema: "designer",
                table: "repository_activity",
                column: "last_accessed_at"
            );

            migrationBuilder.Sql(
                "GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE designer.repository_activity TO designer;"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "repository_activity", schema: "designer");
        }
    }
}
