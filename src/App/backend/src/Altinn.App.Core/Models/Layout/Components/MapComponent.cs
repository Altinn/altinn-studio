using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component specialization for the Map component.
/// </summary>
/// <remarks>
/// <para>
/// A map stores a single location in <c>simpleBinding</c> (a <c>"latitude,longitude"</c> string) and/or
/// references a list of geometries (markers, polygons, ...) through the <c>geometries</c> binding. The bindings
/// inside the geometries list are described by <see cref="MapGeometriesBinding"/>.
/// </para>
/// <para>
/// The remaining Map properties are only used for rendering in the frontend and are not parsed in the backend:
/// <c>layers</c> (tile and WMS layer urls), <c>centerLocation</c> and <c>zoom</c> (initial viewport; the
/// expressions in <c>centerLocation</c> are only evaluated by the frontend), <c>geometryType</c> (whether the
/// <c>data</c> property holds GeoJSON or WKT) and <c>toolbar</c> (which shapes the user is allowed to draw; its
/// boolean expressions are only evaluated by the frontend).
/// </para>
/// </remarks>
public sealed class MapComponent : Base.NoReferenceComponent
{
    private const string SimpleBindingName = "simpleBinding";

    /// <summary>
    /// The binding to the single location string (<c>"latitude,longitude"</c>), or null if the map does not
    /// store a single location.
    /// </summary>
    public required ModelBinding? SimpleBinding { get; init; }

    /// <summary>
    /// The binding to the list of geometries and the bindings inside its objects, or null if the map does not
    /// reference geometries.
    /// </summary>
    public required MapGeometriesBinding? GeometriesBinding { get; init; }

    /// <summary>
    /// Parser for MapComponent
    /// </summary>
    public static MapComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        var id = ParseId(componentElement);
        var componentPath = $"{layoutId}.{pageId}.{id}";
        var dataModelBindings = ParseDataModelBindings(componentElement);

        foreach (var bindingName in dataModelBindings.Keys)
        {
            if (bindingName != SimpleBindingName && !MapGeometriesBinding.IsGeometriesBinding(bindingName))
            {
                throw new JsonException($"Component {componentPath} has unknown 'dataModelBindings.{bindingName}'.");
            }
        }

        // "layers", "centerLocation", "zoom", "geometryType" and "toolbar" only affect rendering in the frontend
        // and are intentionally not parsed here.
        return new MapComponent
        {
            // BaseComponent properties
            Id = id,
            PageId = pageId,
            LayoutId = layoutId,
            Type = ParseType(componentElement),
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = dataModelBindings,
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // MapComponent properties
            SimpleBinding = dataModelBindings.TryGetValue(SimpleBindingName, out var simpleBinding)
                ? simpleBinding
                : null,
            GeometriesBinding = MapGeometriesBinding.Parse(dataModelBindings, componentPath),
        };
    }

    /// <inheritdoc />
    public override async Task<IEnumerable<DataReference>> GetDataReferencesToRemoveWhenHidden(ComponentContext context)
    {
        var references = new List<DataReference>();
        if (SimpleBinding is { } simpleBinding)
        {
            references.Add(await context.AddIndexes(simpleBinding));
        }
        if (GeometriesBinding is { } geometriesBinding)
        {
            references.Add(await context.AddIndexes(geometriesBinding.Geometries));
            // Also report every row and the properties inside it, so that rows shown by a visible map are kept
            // when another component bound to the same list (eg. a repeating group) is hidden.
            await geometriesBinding.AddRowReferences(references, context);
        }

        return references;
    }
}

/// <summary>
/// The <c>geometries</c> binding of a <see cref="MapComponent"/> together with the bindings that point to
/// properties inside the objects of the geometries list.
/// </summary>
/// <remarks>
/// <para>
/// The row bindings (<c>geometryLabel</c>, <c>geometryData</c>, <c>geometryIsEditable</c>, <c>geometryIsHidden</c>
/// and <c>geometryStyle</c>) are stored as written in the layout (eg. <c>geometries.data</c>). When a row binding
/// is not configured, it defaults to the same property the frontend reads on the row objects (<c>label</c>,
/// <c>data</c>, <c>isEditable</c>, <c>isHidden</c> or <c>style</c>).
/// </para>
/// <para>
/// Row bindings only make sense together with a row index, so they are resolved once per row of the list when
/// removing hidden data. The row properties <c>isEditable</c> and <c>isHidden</c> are display flags in the
/// frontend and are never a reason to remove data.
/// </para>
/// </remarks>
public sealed record MapGeometriesBinding
{
    private const string GeometriesBindingName = "geometries";

    private readonly record struct RowBinding(string BindingName, string DefaultProperty);

    private static readonly RowBinding _label = new("geometryLabel", "label");
    private static readonly RowBinding _data = new("geometryData", "data");
    private static readonly RowBinding _isEditable = new("geometryIsEditable", "isEditable");
    private static readonly RowBinding _isHidden = new("geometryIsHidden", "isHidden");
    private static readonly RowBinding _style = new("geometryStyle", "style");
    private static readonly RowBinding[] _rowBindings = [_label, _data, _isEditable, _isHidden, _style];

    /// <summary>
    /// The list of geometry objects
    /// </summary>
    public required ModelBinding Geometries { get; init; }

    /// <summary>
    /// Tooltip text for the geometry (<c>geometryLabel</c>, defaults to the <c>label</c> property)
    /// </summary>
    public required ModelBinding Label { get; init; }

    /// <summary>
    /// The geometry serialized as GeoJSON or WKT (<c>geometryData</c>, defaults to the <c>data</c> property)
    /// </summary>
    public required ModelBinding Data { get; init; }

    /// <summary>
    /// Whether the user can edit the geometry with the toolbar (<c>geometryIsEditable</c>, defaults to the
    /// <c>isEditable</c> property)
    /// </summary>
    public required ModelBinding IsEditable { get; init; }

    /// <summary>
    /// Whether the geometry is hidden on the map (<c>geometryIsHidden</c>, defaults to the <c>isHidden</c> property)
    /// </summary>
    public required ModelBinding IsHidden { get; init; }

    /// <summary>
    /// JSON-serialized Leaflet path options (<c>geometryStyle</c>, defaults to the <c>style</c> property)
    /// </summary>
    public required ModelBinding Style { get; init; }

    /// <summary>
    /// Add a <see cref="DataReference"/> for every row of the geometries list and for each row binding inside it,
    /// indexed with the row indexes of <paramref name="context"/> and the row number.
    /// Row bindings that do not resolve in the data model (eg. a default property that the model does not have)
    /// are skipped.
    /// </summary>
    internal async Task AddRowReferences(List<DataReference> references, ComponentContext context)
    {
        var wrapper = await context.DataAccessor.GetFormDataWrapper(Geometries, context.DataElementIdentifier);
        if (wrapper?.DataElement is not { } dataElement)
        {
            return;
        }

        int rowCount = wrapper.GetRowCount(Geometries.Field, context.RowIndices ?? []) ?? 0;
        ModelBinding[] rowBindings = [Label, Data, IsEditable, IsHidden, Style];
        for (int i = 0; i < rowCount; i++)
        {
            var rowIndexes = RepeatingGroupComponent.GetSubRowIndexes(context.RowIndices, i);
            AddReference(references, wrapper, dataElement, Geometries.Field, rowIndexes);
            foreach (var rowBinding in rowBindings)
            {
                AddReference(references, wrapper, dataElement, rowBinding.Field, rowIndexes);
            }
        }
    }

    private static void AddReference(
        List<DataReference> references,
        IFormDataWrapper wrapper,
        DataElementIdentifier dataElement,
        string field,
        int[] rowIndexes
    )
    {
        // AddIndexToPath returns null when the path does not exist in the data model
        if (wrapper.AddIndexToPath(field, rowIndexes) is { } indexedField)
        {
            references.Add(new DataReference { Field = indexedField, DataElementIdentifier = dataElement });
        }
    }

    /// <summary>
    /// Whether the binding name is <c>geometries</c> or one of the bindings inside the geometries list
    /// </summary>
    internal static bool IsGeometriesBinding(string bindingName) =>
        bindingName == GeometriesBindingName || Array.Exists(_rowBindings, b => b.BindingName == bindingName);

    /// <summary>
    /// Parse and validate the geometries bindings of a Map component.
    /// </summary>
    /// <remarks>
    /// Row bindings are always resolved against the data element of the <c>geometries</c> binding.
    /// </remarks>
    /// <returns>null when the component has no <c>geometries</c> binding</returns>
    /// <exception cref="JsonException">A row binding is configured without <c>geometries</c>.</exception>
    internal static MapGeometriesBinding? Parse(
        IReadOnlyDictionary<string, ModelBinding> dataModelBindings,
        string componentPath
    )
    {
        if (!dataModelBindings.TryGetValue(GeometriesBindingName, out var geometries))
        {
            foreach (var rowBinding in _rowBindings)
            {
                if (dataModelBindings.ContainsKey(rowBinding.BindingName))
                {
                    throw new JsonException(
                        $"Component {componentPath} has 'dataModelBindings.{rowBinding.BindingName}', which requires 'dataModelBindings.{GeometriesBindingName}'."
                    );
                }
            }

            return null;
        }

        return new MapGeometriesBinding
        {
            Geometries = geometries,
            Label = ParseRowBinding(_label),
            Data = ParseRowBinding(_data),
            IsEditable = ParseRowBinding(_isEditable),
            IsHidden = ParseRowBinding(_isHidden),
            Style = ParseRowBinding(_style),
        };

        ModelBinding ParseRowBinding(RowBinding rowBinding)
        {
            if (!dataModelBindings.TryGetValue(rowBinding.BindingName, out var binding))
            {
                // Same default as the frontend uses when the binding is not configured
                return new ModelBinding
                {
                    Field = $"{geometries.Field}.{rowBinding.DefaultProperty}",
                    DataType = geometries.DataType,
                };
            }

            // TODO v9: Reject invalid row bindings during parsing. The dataType check needs the default data type of
            // the layout set, because a binding without dataType and one that names the default data type are the
            // same binding, and that is not known while parsing. Both checks are disabled until then, so that
            // layouts that work in the frontend don't fail here.
            // if (binding.DataType is not null && binding.DataType != geometries.DataType)
            // {
            //     throw new JsonException(
            //         $"Component {componentPath} has 'dataModelBindings.{rowBinding.BindingName}' with dataType '{binding.DataType}', which must match the dataType of 'dataModelBindings.{GeometriesBindingName}'."
            //     );
            // }
            //
            // if (!binding.Field.StartsWith($"{geometries.Field}.", StringComparison.Ordinal))
            // {
            //     throw new JsonException(
            //         $"Component {componentPath} has 'dataModelBindings.{rowBinding.BindingName}' = '{binding.Field}', which must point to a property inside the geometries list '{geometries.Field}'."
            //     );
            // }

            return binding;
        }
    }
}
