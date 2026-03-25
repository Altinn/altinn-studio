using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class BotAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "idx_user_accounts_pid_hash", schema: "designer", table: "user_accounts");

            migrationBuilder.AlterColumn<string>(
                name: "pid_hash",
                schema: "designer",
                table: "user_accounts",
                type: "character varying",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying"
            );

            migrationBuilder.AddColumn<int>(
                name: "account_type",
                schema: "designer",
                table: "user_accounts",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_account_id",
                schema: "designer",
                table: "user_accounts",
                type: "uuid",
                nullable: true
            );

            migrationBuilder.AddColumn<bool>(
                name: "deactivated",
                schema: "designer",
                table: "user_accounts",
                type: "boolean",
                nullable: false,
                defaultValue: false
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "deactivated_at",
                schema: "designer",
                table: "user_accounts",
                type: "timestamptz",
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "organization_name",
                schema: "designer",
                table: "user_accounts",
                type: "character varying",
                nullable: true
            );

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_account_id",
                schema: "designer",
                table: "api_keys",
                type: "uuid",
                nullable: true
            );

            migrationBuilder.CreateIndex(
                name: "idx_user_accounts_organization_name",
                schema: "designer",
                table: "user_accounts",
                column: "organization_name"
            );

            migrationBuilder.CreateIndex(
                name: "idx_user_accounts_pid_hash",
                schema: "designer",
                table: "user_accounts",
                column: "pid_hash",
                unique: true,
                filter: "pid_hash IS NOT NULL"
            );

            migrationBuilder.CreateIndex(
                name: "IX_user_accounts_created_by_user_account_id",
                schema: "designer",
                table: "user_accounts",
                column: "created_by_user_account_id"
            );

            migrationBuilder.CreateIndex(
                name: "IX_api_keys_created_by_user_account_id",
                schema: "designer",
                table: "api_keys",
                column: "created_by_user_account_id"
            );

            migrationBuilder.AddForeignKey(
                name: "FK_api_keys_user_accounts_created_by_user_account_id",
                schema: "designer",
                table: "api_keys",
                column: "created_by_user_account_id",
                principalSchema: "designer",
                principalTable: "user_accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull
            );

            migrationBuilder.AddForeignKey(
                name: "FK_user_accounts_user_accounts_created_by_user_account_id",
                schema: "designer",
                table: "user_accounts",
                column: "created_by_user_account_id",
                principalSchema: "designer",
                principalTable: "user_accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_api_keys_user_accounts_created_by_user_account_id",
                schema: "designer",
                table: "api_keys"
            );

            migrationBuilder.DropForeignKey(
                name: "FK_user_accounts_user_accounts_created_by_user_account_id",
                schema: "designer",
                table: "user_accounts"
            );

            migrationBuilder.DropIndex(
                name: "idx_user_accounts_organization_name",
                schema: "designer",
                table: "user_accounts"
            );

            migrationBuilder.DropIndex(name: "idx_user_accounts_pid_hash", schema: "designer", table: "user_accounts");

            migrationBuilder.DropIndex(
                name: "IX_user_accounts_created_by_user_account_id",
                schema: "designer",
                table: "user_accounts"
            );

            migrationBuilder.DropIndex(
                name: "IX_api_keys_created_by_user_account_id",
                schema: "designer",
                table: "api_keys"
            );

            migrationBuilder.DropColumn(name: "account_type", schema: "designer", table: "user_accounts");

            migrationBuilder.DropColumn(name: "created_by_user_account_id", schema: "designer", table: "user_accounts");

            migrationBuilder.DropColumn(name: "deactivated", schema: "designer", table: "user_accounts");

            migrationBuilder.DropColumn(name: "deactivated_at", schema: "designer", table: "user_accounts");

            migrationBuilder.DropColumn(name: "organization_name", schema: "designer", table: "user_accounts");

            migrationBuilder.DropColumn(name: "created_by_user_account_id", schema: "designer", table: "api_keys");

            migrationBuilder.AlterColumn<string>(
                name: "pid_hash",
                schema: "designer",
                table: "user_accounts",
                type: "character varying",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying",
                oldNullable: true
            );

            migrationBuilder.CreateIndex(
                name: "idx_user_accounts_pid_hash",
                schema: "designer",
                table: "user_accounts",
                column: "pid_hash",
                unique: true
            );
        }
    }
}
