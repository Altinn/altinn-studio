using System.Text.Json;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component specialization for repeating groups with maxCount > 1
/// </summary>
public sealed class RepeatingGroupComponent : Base.RepeatingReferenceComponent
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
            HiddenRow = ParseExpression(componentElement, "hiddenRow"),
            RowsBefore = rowsBefore,
            RowsAfter = rowsAfter,
            BeforeChildReferences = beforeChildReferences,
            AfterChildReferences = afterChildReferences,
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
}
