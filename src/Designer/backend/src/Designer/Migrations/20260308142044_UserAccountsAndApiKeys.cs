using System;
using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class UserAccountsAndApiKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_accounts",
                schema: "designer",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    pid_hash = table.Column<string>(type: "character varying", nullable: false),
                    username = table.Column<string>(type: "character varying", nullable: false),
                    created = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("user_accounts_pkey", x => x.id);
                }
            );

            migrationBuilder.CreateTable(
                name: "api_keys",
                schema: "designer",
                columns: table => new
                {
                    id = table
                        .Column<long>(type: "bigint", nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityAlwaysColumn
                        ),
                    key_hash = table.Column<string>(type: "character varying", nullable: false),
                    user_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying", nullable: false),
                    token_type = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    revoked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("api_keys_pkey", x => x.id);
                    table.ForeignKey(
                        name: "FK_api_keys_user_accounts_user_account_id",
                        column: x => x.user_account_id,
                        principalSchema: "designer",
                        principalTable: "user_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_api_keys_key_hash",
                schema: "designer",
                table: "api_keys",
                column: "key_hash",
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "idx_api_keys_unique_name_per_user",
                schema: "designer",
                table: "api_keys",
                columns: new[] { "user_account_id", "name" },
                unique: true,
                filter: "revoked = false"
            );

            migrationBuilder.CreateIndex(
                name: "idx_api_keys_user_account_id",
                schema: "designer",
                table: "api_keys",
                column: "user_account_id"
            );

            migrationBuilder.CreateIndex(
                name: "idx_user_accounts_pid_hash",
                schema: "designer",
                table: "user_accounts",
                column: "pid_hash",
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "idx_user_accounts_username",
                schema: "designer",
                table: "user_accounts",
                column: "username",
                unique: true
            );

            migrationBuilder.Sql(SqlScriptsReadHelper.ReadSqlScript("UserAccountsAndApiKeys/setup-grants.sql"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "api_keys", schema: "designer");

            migrationBuilder.DropTable(name: "user_accounts", schema: "designer");
        }
    }
}
