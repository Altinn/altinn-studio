using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditFieldsToContactPoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_account_id",
                schema: "designer",
                table: "contact_points",
                type: "uuid",
                nullable: true
            );

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "updated_at",
                schema: "designer",
                table: "contact_points",
                type: "timestamptz",
                nullable: true
            );

            migrationBuilder.Sql(
                """
                UPDATE designer.contact_points
                SET updated_at = created_at
                WHERE updated_at IS NULL;
                """
            );

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "updated_at",
                schema: "designer",
                table: "contact_points",
                type: "timestamptz",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamptz",
                oldNullable: true
            );

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by_user_account_id",
                schema: "designer",
                table: "contact_points",
                type: "uuid",
                nullable: true
            );

            migrationBuilder.CreateIndex(
                name: "IX_contact_points_created_by_user_account_id",
                schema: "designer",
                table: "contact_points",
                column: "created_by_user_account_id"
            );

            migrationBuilder.CreateIndex(
                name: "IX_contact_points_updated_by_user_account_id",
                schema: "designer",
                table: "contact_points",
                column: "updated_by_user_account_id"
            );

            migrationBuilder.AddForeignKey(
                name: "FK_contact_points_user_accounts_created_by_user_account_id",
                schema: "designer",
                table: "contact_points",
                column: "created_by_user_account_id",
                principalSchema: "designer",
                principalTable: "user_accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull
            );

            migrationBuilder.AddForeignKey(
                name: "FK_contact_points_user_accounts_updated_by_user_account_id",
                schema: "designer",
                table: "contact_points",
                column: "updated_by_user_account_id",
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
                name: "FK_contact_points_user_accounts_created_by_user_account_id",
                schema: "designer",
                table: "contact_points"
            );

            migrationBuilder.DropForeignKey(
                name: "FK_contact_points_user_accounts_updated_by_user_account_id",
                schema: "designer",
                table: "contact_points"
            );

            migrationBuilder.DropIndex(
                name: "IX_contact_points_created_by_user_account_id",
                schema: "designer",
                table: "contact_points"
            );

            migrationBuilder.DropIndex(
                name: "IX_contact_points_updated_by_user_account_id",
                schema: "designer",
                table: "contact_points"
            );

            migrationBuilder.DropColumn(
                name: "created_by_user_account_id",
                schema: "designer",
                table: "contact_points"
            );

            migrationBuilder.DropColumn(name: "updated_at", schema: "designer", table: "contact_points");

            migrationBuilder.DropColumn(
                name: "updated_by_user_account_id",
                schema: "designer",
                table: "contact_points"
            );
        }
    }
}
