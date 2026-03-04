using System;
using Altinn.Studio.Designer.Migrations.SqlScripts;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class UserAccountsAndPersonalAccessTokens : Migration
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
                name: "personal_access_tokens",
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
                    display_name = table.Column<string>(type: "character varying", nullable: false),
                    token_type = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    revoked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("personal_access_tokens_pkey", x => x.id);
                    table.ForeignKey(
                        name: "FK_personal_access_tokens_user_accounts_user_account_id",
                        column: x => x.user_account_id,
                        principalSchema: "designer",
                        principalTable: "user_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade
                    );
                }
            );

            migrationBuilder.CreateIndex(
                name: "idx_personal_access_tokens_key_hash",
                schema: "designer",
                table: "personal_access_tokens",
                column: "key_hash",
                unique: true
            );

            migrationBuilder.CreateIndex(
                name: "idx_personal_access_tokens_user_account_id",
                schema: "designer",
                table: "personal_access_tokens",
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

            migrationBuilder.Sql(
                SqlScriptsReadHelper.ReadSqlScript("UserAccountsAndPersonalAccessTokens/setup-grants.sql")
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "personal_access_tokens", schema: "designer");

            migrationBuilder.DropTable(name: "user_accounts", schema: "designer");
        }
    }
}
