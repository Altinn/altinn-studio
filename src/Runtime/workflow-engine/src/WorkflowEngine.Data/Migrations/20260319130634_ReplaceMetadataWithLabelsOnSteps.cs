using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceMetadataWithLabelsOnSteps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "MetadataJson", schema: "engine", table: "Workflows");

            migrationBuilder.RenameColumn(name: "MetadataJson", schema: "engine", table: "Steps", newName: "Labels");

            migrationBuilder
                .CreateIndex(name: "IX_Steps_Labels", schema: "engine", table: "Steps", column: "Labels")
                .Annotation("Npgsql:IndexMethod", "gin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Steps_Labels", schema: "engine", table: "Steps");

            migrationBuilder.RenameColumn(name: "Labels", schema: "engine", table: "Steps", newName: "MetadataJson");

            migrationBuilder.AddColumn<string>(
                name: "MetadataJson",
                schema: "engine",
                table: "Workflows",
                type: "jsonb",
                nullable: true
            );
        }
    }
}
