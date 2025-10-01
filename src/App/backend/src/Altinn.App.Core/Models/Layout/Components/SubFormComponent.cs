using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component for handling subforms
/// </summary>
public record SubFormComponent : BaseComponent
{
    /// <summary>Constructor</summary>
    /// <remarks>
    /// Note that some properties are commented out, as they are currently not used, and might allow expressions in the future
    /// </remarks>
    public SubFormComponent(
        string id,
        string type,
        IReadOnlyDictionary<string, ModelBinding>? dataModelBindings,
        string layoutSetId,
        // List<TableColumn> tableColumns,
        // bool showAddButton,
        // bool showDeleteButton,
        Expression hidden,
        Expression required,
        Expression readOnly,
        IReadOnlyDictionary<string, string>? additionalProperties
    )
        : base(id, type, dataModelBindings, hidden, required, readOnly, additionalProperties)
    {
        LayoutSetId = layoutSetId;
        // TableColumns = tableColumns;
        // ShowAddButton = showAddButton;
        // ShowDeleteButton = showDeleteButton;
    }

    /// <summary>
    /// The layout set to load for this subform
    /// </summary>
    public string LayoutSetId { get; }

    // /// <summary>
    // /// Specification for preview of subForms in main form
    // /// </summary>
    // public List<TableColumn> TableColumns { get; }
    // /// <summary>
    // /// Show button to add a new row
    // /// </summary>
    // public bool ShowAddButton { get; }
    // /// <summary>
    // /// Show button to remove a row
    // /// </summary>
    // public bool ShowDeleteButton { get; }

    /// <summary>
    /// Specification for preview of subForms in main form
    /// </summary>
    /// <param name="HeaderContent">The header value to display. May contain a text resource bindings, but no data model lookups.</param>
    /// <param name="CellContent"></param>
    public record TableColumn(string HeaderContent, CellContent CellContent);

    /// <summary>
    /// How to select the content of a cell in a subform preview
    /// </summary>
    /// <param name="Query">The cell value to display from a data model lookup (dot notation).</param>
    /// <param name="DefaultContent">The cell value to display if `query` returns no result.</param>
    public record CellContent(string Query, string DefaultContent);
}
