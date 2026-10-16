using System.Collections.Immutable;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component specialization for repeating groups with maxCount > 1
/// </summary>
public sealed class RepeatingGroupComponent : ReferenceComponent
{
    /// <summary>
    /// The ids of the components this component claims as children: rows before, repeating children, rows after.
    /// </summary>
    internal static IEnumerable<string> ClaimChildren(JsonElement componentElement)
    {
        var (before, repeating, after) = ParseChildIds(componentElement);
        return before.Concat(repeating).Concat(after);
    }

    /// <summary>
    /// Parser for RepeatingGroupComponent
    /// </summary>
    internal static RepeatingGroupComponent Parse(
        JsonElement componentElement,
        string pageId,
        string layoutId,
        int maxCount,
        IReadOnlyList<BaseLayoutComponent> children
    )
    {
        var id = ParseId(componentElement);
        var type = ParseType(componentElement);
        var dataModelBindings = ParseDataModelBindings(componentElement);

        if (!dataModelBindings.TryGetValue("group", out var groupModelBinding))
        {
            throw new JsonException($"{type} must have a 'group' data model binding.");
        }

        if (string.IsNullOrWhiteSpace(groupModelBinding.Field))
        {
            throw new JsonException(
                $"Component {layoutId}.{pageId}.{id} must have 'dataModelBindings.group' which is a non-empty string or object with a non-empty 'field'."
            );
        }

        var (beforeIds, repeatingIds, afterIds) = ParseChildIds(componentElement);
        var removeWhenHidden = ParseRemoveWhenHiddenExpression(componentElement);
        var textResourceBindings = ParseTextResourceBindings(componentElement);
        var hiddenRow = ParseExpression(componentElement, "hiddenRow", ExpressionValue.False);

        return new RepeatingGroupComponent
        {
            Id = id,
            Type = type,
            PageId = pageId,
            LayoutId = layoutId,
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = removeWhenHidden,
            DataModelBindings = dataModelBindings,
            TextResourceBindings = textResourceBindings,
            // RepeatingGroupComponent properties
            MaxCount = maxCount,
            GroupModelBinding = groupModelBinding,
            HiddenRow = hiddenRow,
            RowsBefore = ParseGridConfig("rowsBefore", componentElement),
            RowsAfter = ParseGridConfig("rowsAfter", componentElement),
            BeforeChildren = FindChildren(children, beforeIds),
            RepeatingChildren = FindChildren(children, repeatingIds),
            AfterChildren = FindChildren(children, afterIds),
            Children = children,
            RowComponent = new RepeatingGroupRowComponent()
            {
                Id = $"{id}__group_row",
                PageId = pageId,
                LayoutId = layoutId,
                DataModelBindings = dataModelBindings,
                RemoveWhenHidden = removeWhenHidden,
                Type = "repeatingGroupRow",
                // We don't have a row level readOnly, only at the group or child component level
                ReadOnly = Expression.False,
                // We don't have a row level required, only at the group or child component level
                Required = Expression.False,
                TextResourceBindings = textResourceBindings,
                Hidden = hiddenRow,
                GroupModelBinding = groupModelBinding,
            },
        };
    }

    private static (
        ImmutableArray<string> Before,
        ImmutableArray<string> Repeating,
        ImmutableArray<string> After
    ) ParseChildIds(JsonElement componentElement)
    {
        var repeating = ParseChildReferences(componentElement);
        var before = GridComponent.GetComponentIds(ParseGridConfig("rowsBefore", componentElement));
        var after = GridComponent.GetComponentIds(ParseGridConfig("rowsAfter", componentElement));
        return ([.. before], repeating, [.. after]);
    }

    private static ImmutableArray<GridComponent.GridRowConfig> ParseGridConfig(
        string propertyName,
        JsonElement componentElement
    )
    {
        if (
            componentElement.TryGetProperty(propertyName, out JsonElement gridConfigElement)
            && gridConfigElement.ValueKind != JsonValueKind.Null
        )
        {
            return GridComponent.DeserializeRows(gridConfigElement, propertyName);
        }

        return [];
    }

    /// <summary>
    /// Maximum number of repetitions of this repeating group
    /// </summary>
    public required int MaxCount { get; init; }

    /// <summary>
    /// List of rows before the repeating group, used to associate components that are not repeated to the repeating group for layout purposes
    /// </summary>
    public required IReadOnlyList<GridComponent.GridRowConfig> RowsBefore { get; init; }

    /// <summary>
    /// List of rows after the repeating group, used to associate components that are not repeated to the repeating group for layout purposes
    /// </summary>
    public required IReadOnlyList<GridComponent.GridRowConfig> RowsAfter { get; init; }

    /// <summary>
    /// Model binding for the group that defines the number of repetitions of the repeating group.
    /// </summary>
    public required ModelBinding GroupModelBinding { get; init; }

    /// <summary>
    /// The expression that determines if the row is hidden.
    /// </summary>
    public required Expression HiddenRow { get; init; }

    /// <summary>
    /// Child components that are repeated for each row in the repeating group.
    /// </summary>
    public required IReadOnlyList<BaseLayoutComponent> RepeatingChildren { get; init; }

    /// <summary>
    /// Child components that are not repeated and come before the repeating group
    /// </summary>
    public required IReadOnlyList<BaseLayoutComponent> BeforeChildren { get; init; }

    /// <summary>
    /// Child components that are not repeated and come after the repeating group
    /// </summary>
    public required IReadOnlyList<BaseLayoutComponent> AfterChildren { get; init; }

    /// <summary>
    /// The component used for the context of each row
    /// </summary>
    public required RepeatingGroupRowComponent RowComponent { get; init; }

    internal static int[] GetSubRowIndexes(int[]? baseIndexes, int index)
    {
        if (baseIndexes is null || baseIndexes.Length == 0)
        {
            return new[] { index };
        }
        var result = new int[baseIndexes.Length + 1];
        Array.Copy(baseIndexes, result, baseIndexes.Length);
        result[^1] = index;
        return result;
    }

    /// <inheritdoc />
    public override async Task<ComponentContext> GetContext(
        IInstanceDataAccessor dataAccessor,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        IReadOnlyDictionary<string, UiFolderComponent> layoutsLookup
    )
    {
        var childContexts = new List<ComponentContext>();

        foreach (var child in BeforeChildren)
        {
            childContexts.Add(
                await child.GetContext(dataAccessor, defaultDataElementIdentifier, rowIndexes, layoutsLookup)
            );
        }

        var formDataWrapper = await dataAccessor.GetFormDataWrapper(GroupModelBinding, defaultDataElementIdentifier);
        int rowCount = formDataWrapper?.GetRowCount(GroupModelBinding.Field, rowIndexes ?? []) ?? 0;

        for (int i = 0; i < rowCount; i++)
        {
            var subRowIndexes = GetSubRowIndexes(rowIndexes, i);
            List<ComponentContext> rowChildren = new(RepeatingChildren.Count);
            foreach (var child in RepeatingChildren)
            {
                rowChildren.Add(
                    await child.GetContext(dataAccessor, defaultDataElementIdentifier, subRowIndexes, layoutsLookup)
                );
            }

            childContexts.Add(
                new ComponentContext(
                    dataAccessor,
                    RowComponent,
                    subRowIndexes,
                    defaultDataElementIdentifier,
                    rowChildren
                )
            );
        }

        foreach (var child in AfterChildren)
        {
            childContexts.Add(
                await child.GetContext(dataAccessor, defaultDataElementIdentifier, rowIndexes, layoutsLookup)
            );
        }

        return new ComponentContext(dataAccessor, this, rowIndexes, defaultDataElementIdentifier, childContexts);
    }
}

/// <summary>
/// Component for each row (not read from JSON layout, but created when parsing the repeating group).
/// </summary>
public sealed class RepeatingGroupRowComponent : BaseComponent
{
    /// <summary>
    /// Model binding for the group
    /// </summary>
    public required ModelBinding GroupModelBinding { get; init; }

    /// <inheritdoc />
    public override async Task<bool> IsHidden(ComponentContext context)
    {
        var rowValue = await context.State.GetModelData(
            GroupModelBinding,
            context.DataElementIdentifier,
            context.RowIndices
        );
        // The row is always considered hidden if the row is null in the data model
        if (rowValue is null)
        {
            return true;
        }

        return await base.IsHidden(context);
    }
}
