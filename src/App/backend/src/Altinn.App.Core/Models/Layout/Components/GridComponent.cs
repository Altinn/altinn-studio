using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Tag component to signify that this is a grid component
/// </summary>
public sealed class GridComponent : ReferenceComponent
{
    /// <summary>
    /// Parser for GridComponent
    /// </summary>
    public static GridComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        var id = ParseId(componentElement);
        var type = ParseType(componentElement);

        if (!componentElement.TryGetProperty("rows", out JsonElement rowsElement))
        {
            throw new JsonException("GridComponent must have a \"rows\" property.");
        }

        var rows =
            rowsElement.Deserialize<List<GridRowConfig>>()
            ?? throw new JsonException("Failed to deserialize rows in GridComponent.");

        return new GridComponent
        {
            // BaseComponent properties
            Id = id,
            Type = type,
            PageId = pageId,
            LayoutId = layoutId,
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = ParseDataModelBindings(componentElement),
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // GridComponent properties
            Rows = rows,
            ChildReferences = rows.SelectMany(r => r.Cells).Select(c => c?.ComponentId).OfType<string>().ToList(),
        };
    }

    /// <summary>
    /// Content from the "rows" property in the JSON representation of the grid component.
    /// </summary>
    public required List<GridRowConfig> Rows { get; init; }

    /// <summary>
    /// Class for parsing a Grid component's rows and cells and extracting the child component IDs
    /// </summary>
    public class GridRowConfig
    {
        /// <summary>
        /// List of cells in the grid row, each cell can optionally refer to a component ID (or static headers we don't care about in backend)
        /// </summary>
        [JsonPropertyName("cells")]
        public required List<GridCellConfig?> Cells { get; set; }
    }

    /// <summary>
    /// Config for a cell in a grid row that refers to a component ID
    /// </summary>
    /// <remarks>
    /// The JSON schema allows different types of cells (polymorphism), but they are only important visually
    /// and can be ignored for backend processing.
    /// </remarks>
    public class GridCellConfig
    {
        /// <summary>
        /// The component ID of the cell
        /// </summary>
        [JsonPropertyName("component")]
        public string? ComponentId { get; set; }
    }
}
