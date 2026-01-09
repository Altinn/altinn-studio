using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component specialization for repeating groups with maxCount > 1
/// </summary>
public sealed class RepeatingGroupComponent : Base.ReferenceComponent
{
    /// <summary>
    /// Parser for RepeatingGroupComponent
    /// </summary>
    public static RepeatingGroupComponent Parse(
        JsonElement componentElement,
        string pageId,
        string layoutId,
        int maxCount
    )
    {
        var id = ParseId(componentElement);
        var type = ParseType(componentElement);
        var dataModelBindings = ParseDataModelBindings(componentElement);

        if (
            !componentElement.TryGetProperty("children", out JsonElement childIdsElement)
            || childIdsElement.ValueKind != JsonValueKind.Array
        )
        {
            throw new JsonException($"{type} must have a \"children\" property that contains a list of strings.");
        }

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

        var repeatingChildReferences = ParseChildReferences(componentElement, layoutId, pageId);

        var rowsBefore = ParseGridConfig("rowsBefore", componentElement);

        var rowsAfter = ParseGridConfig("rowsAfter", componentElement);

        var beforeChildReferences = rowsBefore
            .SelectMany(row => row.Cells?.Select(cell => cell?.ComponentId) ?? [])
            .OfType<string>()
            .ToList();

        var afterChildReferences = rowsAfter
            .SelectMany(row => row.Cells?.Select(cell => cell?.ComponentId) ?? [])
            .OfType<string>()
            .ToList();

        return new RepeatingGroupComponent
        {
            Id = id,
            Type = type,
            PageId = pageId,
            LayoutId = layoutId,
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = dataModelBindings,
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // RepeatingGroupComponent properties
            MaxCount = maxCount,
            GroupModelBinding = groupModelBinding,
            RepeatingChildReferences = repeatingChildReferences,
            HiddenRow = ParseExpression(componentElement, "hiddenRow", ExpressionValue.False),
            RowsBefore = rowsBefore,
            RowsAfter = rowsAfter,
            BeforeChildReferences = beforeChildReferences,
            AfterChildReferences = afterChildReferences,
            ChildReferences = beforeChildReferences
                .Concat(repeatingChildReferences)
                .Concat(afterChildReferences)
                .ToList(),
        };
    }

    private static List<GridComponent.GridRowConfig> ParseGridConfig(string propertyName, JsonElement componentElement)
    {
        if (
            componentElement.TryGetProperty(propertyName, out JsonElement gridConfigElement)
            && gridConfigElement.ValueKind != JsonValueKind.Null
        )
        {
            if (gridConfigElement.ValueKind != JsonValueKind.Array)
            {
                throw new JsonException(
                    $"If present, RepeatingGroupComponent \"{propertyName}\" property must be an array."
                );
            }
            return gridConfigElement.Deserialize<List<GridComponent.GridRowConfig>>()
                ?? throw new JsonException($"Failed to deserialize {propertyName} in RepeatingGroupComponent.");
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
    /// List of references to child components that are repeated for each row in the repeating group.
    /// </summary>
    public required IReadOnlyList<string> RepeatingChildReferences { get; init; }

    /// <summary>
    /// References to child components that are not repeated and comes before the repeating group
    /// </summary>
    public required IReadOnlyList<string> BeforeChildReferences { get; init; }

    /// <summary>
    /// References to child components that are not repeated and comes after the repeating group
    /// </summary>
    public required IReadOnlyList<string> AfterChildReferences { get; init; }

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

    private RepeatingGroupRowComponent? _repeatingGroupRowComponent;

    /// <inheritdoc />
    public override async Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    )
    {
        var childContexts = new List<ComponentContext>();

        foreach (var componentId in BeforeChildReferences)
        {
            childContexts.Add(
                await GetClaimedChildComponentContext(
                    componentId,
                    state,
                    defaultDataElementIdentifier,
                    rowIndexes,
                    layoutsLookup
                )
            );
        }

        var rowCount = await state.GetModelDataCount(GroupModelBinding, defaultDataElementIdentifier, rowIndexes) ?? 0;

        _repeatingGroupRowComponent ??= RepeatingGroupRowComponent.FromGroup(this);

        for (int i = 0; i < rowCount; i++)
        {
            var subRowIndexes = GetSubRowIndexes(rowIndexes, i);
            List<ComponentContext> rowChildren = [];
            foreach (var componentId in RepeatingChildReferences)
            {
                rowChildren.Add(
                    await GetClaimedChildComponentContext(
                        componentId,
                        state,
                        defaultDataElementIdentifier,
                        subRowIndexes,
                        layoutsLookup
                    )
                );
            }

            childContexts.Add(
                new ComponentContext(
                    state,
                    _repeatingGroupRowComponent,
                    subRowIndexes,
                    defaultDataElementIdentifier,
                    rowChildren
                )
            );
        }

        foreach (var componentId in AfterChildReferences)
        {
            childContexts.Add(
                await GetClaimedChildComponentContext(
                    componentId,
                    state,
                    defaultDataElementIdentifier,
                    rowIndexes,
                    layoutsLookup
                )
            );
        }

        return new ComponentContext(state, this, rowIndexes, defaultDataElementIdentifier, childContexts);
    }
}

/// <summary>
/// Component for each row (not read from JSON layout, but created when generating contexts for repeating groups).
/// </summary>
public class RepeatingGroupRowComponent : Base.BaseComponent
{
    /// <summary>
    /// Initializes a new instance of the <see cref="RepeatingGroupRowComponent"/> class from the surrounding group component.
    /// </summary>
    public static RepeatingGroupRowComponent FromGroup(RepeatingGroupComponent repeatingGroupComponent)
    {
        return new RepeatingGroupRowComponent()
        {
            Id = $"{repeatingGroupComponent.Id}__group_row",
            PageId = repeatingGroupComponent.PageId,
            LayoutId = repeatingGroupComponent.LayoutId,
            DataModelBindings = repeatingGroupComponent.DataModelBindings,
            RemoveWhenHidden = repeatingGroupComponent.RemoveWhenHidden,
            Type = "repeatingGroupRow",
            // We don't have a row level readOnly, only at the group or child component level
            ReadOnly = Expression.False,
            // We don't have a row level required, only at the group or child component level
            Required = Expression.False,
            TextResourceBindings = repeatingGroupComponent.TextResourceBindings,
            Hidden = repeatingGroupComponent.HiddenRow,
            GroupModelBinding = repeatingGroupComponent.GroupModelBinding,
        };
    }

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
