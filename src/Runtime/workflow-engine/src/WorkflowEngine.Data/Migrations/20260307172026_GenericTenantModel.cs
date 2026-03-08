using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class GenericTenantModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_InstanceGuid_Status", table: "Workflows");

            migrationBuilder.DropIndex(name: "IX_Workflows_InstanceOrg_InstanceApp_InstanceGuid", table: "Workflows");

            migrationBuilder.DropPrimaryKey(name: "PK_idempotency_keys", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "ActorLanguage", table: "Workflows");

            migrationBuilder.DropColumn(name: "ActorUserIdOrOrgNumber", table: "Workflows");

            migrationBuilder.DropColumn(name: "InstanceApp", table: "Workflows");

            migrationBuilder.DropColumn(name: "InstanceGuid", table: "Workflows");

            migrationBuilder.DropColumn(name: "InstanceLockKey", table: "Workflows");

            migrationBuilder.DropColumn(name: "InstanceOrg", table: "Workflows");

            migrationBuilder.DropColumn(name: "InstanceOwnerPartyId", table: "Workflows");

            migrationBuilder.DropColumn(name: "ActorLanguage", table: "Steps");

            migrationBuilder.DropColumn(name: "ActorUserIdOrOrgNumber", table: "Steps");

            migrationBuilder.DropColumn(name: "instance_org", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "instance_owner_party_id", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "instance_guid", table: "idempotency_keys");

            migrationBuilder.RenameColumn(name: "instance_app", table: "idempotency_keys", newName: "tenant_id");

            migrationBuilder.AddColumn<string>(name: "ContextJson", table: "Workflows", type: "jsonb", nullable: true);

            migrationBuilder.AddColumn<string>(name: "LabelsJson", table: "Workflows", type: "jsonb", nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "Workflows",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddPrimaryKey(
                name: "PK_idempotency_keys",
                table: "idempotency_keys",
                columns: new[] { "idempotency_key", "tenant_id" }
            );

            migrationBuilder
                .CreateIndex(name: "IX_Workflows_LabelsJson", table: "Workflows", column: "LabelsJson")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_TenantId_Status",
                table: "Workflows",
                columns: new[] { "TenantId", "Status" }
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Workflows_LabelsJson", table: "Workflows");

            migrationBuilder.DropIndex(name: "IX_Workflows_TenantId_Status", table: "Workflows");

            migrationBuilder.DropPrimaryKey(name: "PK_idempotency_keys", table: "idempotency_keys");

            migrationBuilder.DropColumn(name: "ContextJson", table: "Workflows");

            migrationBuilder.DropColumn(name: "LabelsJson", table: "Workflows");

            migrationBuilder.DropColumn(name: "TenantId", table: "Workflows");

            migrationBuilder.RenameColumn(name: "tenant_id", table: "idempotency_keys", newName: "instance_app");

            migrationBuilder.AddColumn<string>(
                name: "ActorLanguage",
                table: "Workflows",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "ActorUserIdOrOrgNumber",
                table: "Workflows",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<string>(
                name: "InstanceApp",
                table: "Workflows",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<Guid>(
                name: "InstanceGuid",
                table: "Workflows",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000")
            );

            migrationBuilder.AddColumn<string>(
                name: "InstanceLockKey",
                table: "Workflows",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "InstanceOrg",
                table: "Workflows",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<int>(
                name: "InstanceOwnerPartyId",
                table: "Workflows",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder.AddColumn<string>(
                name: "ActorLanguage",
                table: "Steps",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true
            );

            migrationBuilder.AddColumn<string>(
                name: "ActorUserIdOrOrgNumber",
                table: "Steps",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<string>(
                name: "instance_org",
                table: "idempotency_keys",
                type: "text",
                nullable: false,
                defaultValue: ""
            );

            migrationBuilder.AddColumn<int>(
                name: "instance_owner_party_id",
                table: "idempotency_keys",
                type: "integer",
                nullable: false,
                defaultValue: 0
            );

            migrationBuilder.AddColumn<Guid>(
                name: "instance_guid",
                table: "idempotency_keys",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000")
            );

            migrationBuilder.AddPrimaryKey(
                name: "PK_idempotency_keys",
                table: "idempotency_keys",
                columns: new[]
                {
                    "idempotency_key",
                    "instance_org",
                    "instance_app",
                    "instance_owner_party_id",
                    "instance_guid",
                }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_InstanceGuid_Status",
                table: "Workflows",
                columns: new[] { "InstanceGuid", "Status" }
            );

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_InstanceOrg_InstanceApp_InstanceGuid",
                table: "Workflows",
                columns: new[] { "InstanceOrg", "InstanceApp", "InstanceGuid" }
            );
        }
    }
}
