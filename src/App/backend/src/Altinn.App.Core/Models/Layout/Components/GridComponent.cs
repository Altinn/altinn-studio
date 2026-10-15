using System.Collections.Immutable;
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
    /// The ids of the components this component claims as children.
    /// </summary>
    internal static IEnumerable<string> ClaimChildren(JsonElement componentElement) =>
        GetComponentIds(ParseRows(componentElement));

    /// <summary>
    /// Parser for GridComponent
    /// </summary>
    internal static GridComponent Parse(
        JsonElement componentElement,
        string pageId,
        string layoutId,
        IReadOnlyList<BaseLayoutComponent> children
    )
    {
        return new GridComponent
        {
            // BaseComponent properties
            Id = ParseId(componentElement),
            Type = ParseType(componentElement),
            PageId = pageId,
            LayoutId = layoutId,
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = ParseDataModelBindings(componentElement),
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // GridComponent properties
            Rows = ParseRows(componentElement),
            Children = children,
        };
    }

    private static ImmutableArray<GridRowConfig> ParseRows(JsonElement componentElement)
    {
        if (!componentElement.TryGetProperty("rows", out JsonElement rowsElement))
        {
            throw new JsonException("GridComponent must have a \"rows\" property.");
        }

        return DeserializeRows(rowsElement, "rows");
    }

    /// <summary>
    /// Deserialize a JSON array of grid rows (used for "rows" in Grid and "rowsBefore"/"rowsAfter" in RepeatingGroup).
    /// </summary>
    internal static ImmutableArray<GridRowConfig> DeserializeRows(JsonElement rowsElement, string propertyName)
    {
        if (rowsElement.ValueKind != JsonValueKind.Array)
        {
            throw new JsonException($"\"{propertyName}\" must be an array.");
        }

        return rowsElement.Deserialize<ImmutableArray<GridRowConfig>>();
    }

    /// <summary>
    /// The component ids referenced by the cells of the rows, in order.
    /// </summary>
    internal static IEnumerable<string> GetComponentIds(IEnumerable<GridRowConfig> rows) =>
        rows.SelectMany(r => r.Cells).Select(c => c?.ComponentId).OfType<string>();

    /// <summary>
    /// Content from the "rows" property in the JSON representation of the grid component.
    /// </summary>
    public required IReadOnlyList<GridRowConfig> Rows { get; init; }

    /// <summary>
    /// Class for parsing a Grid component's rows and cells and extracting the child component IDs
    /// </summary>
    public sealed class GridRowConfig
    {
        /// <summary>
        /// Create a grid row
        /// </summary>
        [JsonConstructor]
        public GridRowConfig(IReadOnlyList<GridCellConfig?>? cells)
        {
            if (cells is null)
            {
                throw new JsonException("Each grid row must have a \"cells\" array.");
            }
            Cells = cells.ToImmutableArray();
        }

        /// <summary>
        /// List of cells in the grid row, each cell can optionally refer to a component ID (or static headers we don't care about in backend)
        /// </summary>
        [JsonPropertyName("cells")]
        public IReadOnlyList<GridCellConfig?> Cells { get; }
    }

    /// <summary>
    /// Config for a cell in a grid row that refers to a component ID
    /// </summary>
    /// <remarks>
    /// The JSON schema allows different types of cells (polymorphism), but they are only important visually
    /// and can be ignored for backend processing.
    /// </remarks>
    public sealed class GridCellConfig
    {
        /// <summary>
        /// The component ID of the cell
        /// </summary>
        [JsonPropertyName("component")]
        public string? ComponentId { get; init; }
    }
}
