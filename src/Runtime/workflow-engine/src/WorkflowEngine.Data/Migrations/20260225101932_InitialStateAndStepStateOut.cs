using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkflowEngine.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialStateAndStepStateOut : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(name: "State", table: "Workflows", newName: "InitialState");

            migrationBuilder.AddColumn<string>(name: "StateOut", table: "Steps", type: "text", nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "StateOut", table: "Steps");

            migrationBuilder.RenameColumn(name: "InitialState", table: "Workflows", newName: "State");
        }
    }
}
