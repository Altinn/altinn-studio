using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace WorkflowEngine.Data.Conventions;

/// <summary>
/// Rewrites every table, column, key, foreign key and index name in the EF Core model to snake_case.
/// Applied at the end of <c>OnModelCreating</c> so it picks up everything configured by attributes
/// and fluent API calls. Idempotent on names that are already snake_case.
/// </summary>
internal static partial class SnakeCaseNamingConvention
{
    [GeneratedRegex("([A-Z]+)([A-Z][a-z])")]
    private static partial Regex AcronymBoundary();

    [GeneratedRegex("([a-z0-9])([A-Z])")]
    private static partial Regex CamelBoundary();

    /// <summary>
    /// Converts a PascalCase or camelCase identifier to snake_case. Two-pass: the first pass
    /// inserts a separator at acronym boundaries (e.g. <c>JSONOptions</c> → <c>JSON_Options</c>),
    /// the second handles the simple lower-then-upper case (e.g. <c>WorkflowId</c> → <c>Workflow_Id</c>).
    /// </summary>
    [SuppressMessage(
        "Globalization",
        "CA1308:Normalize strings to uppercase",
        Justification = "snake_case requires lowercase"
    )]
    internal static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name))
            return name;

        var withAcronymBoundaries = AcronymBoundary().Replace(name, "$1_$2");
        var withAllBoundaries = CamelBoundary().Replace(withAcronymBoundaries, "$1_$2");
        return withAllBoundaries.ToLowerInvariant();
    }

    /// <summary>
    /// Walks the model and rewrites every generated identifier to snake_case.
    /// Call at the end of <c>OnModelCreating</c>.
    /// </summary>
    internal static void Apply(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var tableName = entity.GetTableName();
            if (tableName is not null)
                entity.SetTableName(ToSnakeCase(tableName));

            foreach (var property in entity.GetProperties())
                property.SetColumnName(ToSnakeCase(property.GetColumnName()));

            foreach (var key in entity.GetKeys())
            {
                var name = key.GetName();
                if (name is not null)
                    key.SetName(ToSnakeCase(name));
            }

            foreach (var foreignKey in entity.GetForeignKeys())
            {
                var name = foreignKey.GetConstraintName();
                if (name is not null)
                    foreignKey.SetConstraintName(ToSnakeCase(name));
            }

            foreach (var index in entity.GetIndexes())
            {
                var name = index.GetDatabaseName();
                if (name is not null)
                    index.SetDatabaseName(ToSnakeCase(name));
            }
        }
    }
}
