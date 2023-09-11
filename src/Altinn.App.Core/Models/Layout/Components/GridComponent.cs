using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component specialisation for repeating groups with maxCount > 1
/// </summary>
public class GridComponent : GroupComponent
{
    /// <summary>
    /// Constructor for RepeatingGroupComponent
    /// </summary>
    public GridComponent(string id, string type, IReadOnlyDictionary<string, string>? dataModelBindings, IEnumerable<BaseComponent> children, IEnumerable<string>? childIDs, Expression? hidden, Expression? required, Expression? readOnly, IReadOnlyDictionary<string, string>? additionalProperties) :
        base(id, type, dataModelBindings, children, childIDs, hidden, required, readOnly, additionalProperties)
    { }
}


/// <summary>
/// Class for parsing a Grid component's rows and cells and extracting the child component IDs
/// </summary>
public class GridConfig
{

    /// <summary>
    /// Reads the Grid component's rows and returns the child component IDs
    /// </summary>
    /// <param name="reader"></param>
    /// <param name="options"></param>
    /// <returns></returns>
    public static List<string> ReadGridChildren(ref Utf8JsonReader reader, JsonSerializerOptions options)
    {
        var rows = JsonSerializer.Deserialize<GridRow[]>(ref reader, options);
        var gridConfig = new GridConfig { Rows = rows };
        return gridConfig.Children();
    }

    /// <summary>
    /// Rows in the grid
    /// </summary>
    [JsonPropertyName("rows")]
    public GridRow[]? Rows { get; set; }

    /// <summary>
    /// Defines a row in a grid
    /// </summary>
    public class GridRow
    {
        /// <summary>
        /// Cells in the row
        /// </summary>
        [JsonPropertyName("cells")]
        public GridCell[]? Cells { get; set; }

        /// <summary>
        /// Defines a cell in a grid
        /// </summary>
        public class GridCell
        {
            /// <summary>
            /// The component ID of the cell
            /// </summary>
            [JsonPropertyName("component")]
            public string? ComponentId { get; set; }
        }
    }

    /// <summary>
    /// Returns the child component IDs
    /// </summary>
    /// <returns></returns>
    public List<String> Children()
    {
        return this.Rows?
            .Where(r => r.Cells is not null)
            .SelectMany(r => r.Cells!)
            .Where(c => c.ComponentId is not null)
            .Select(c => c.ComponentId!)
            .ToList()
            ?? new List<String>();
    }
}
