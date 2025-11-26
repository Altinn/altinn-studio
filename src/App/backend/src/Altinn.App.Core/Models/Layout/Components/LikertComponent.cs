using System.Text.Json;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component specialization for Likert components.
/// Likert components are used for survey-style questions where multiple items share the same rating scale.
/// </summary>
public sealed class LikertComponent : Base.NoReferenceComponent
{
    // internal required RowFilter? RowFilter { get; init; }

    /// <inheritdoc/>
    public override Task<IEnumerable<DataReference>> GetDataReferencesToRemoveWhenHidden(ComponentContext context)
    {
        // TODO: Determine how this should work.
        // Ideally it should probably return the indexed references for the answer property on the visible rows (restricted by RowFilter if present).
        // This way the questions will always remain in the data model.
        return Task.FromResult<IEnumerable<DataReference>>([]);
    }

    /// <summary>
    /// Parser for LikertComponent
    /// </summary>
    public static LikertComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        var dataModelBindings = ParseDataModelBindings(componentElement);

        // Likert components must have a 'questions' data model binding that points to the repeating collection
        if (!dataModelBindings.TryGetValue("questions", out var questionsModelBinding))
        {
            throw new JsonException($"{ParseType(componentElement)} must have a 'questions' data model binding.");
        }

        if (string.IsNullOrWhiteSpace(questionsModelBinding.Field))
        {
            throw new JsonException(
                $"Component {layoutId}.{pageId}.{ParseId(componentElement)} must have 'dataModelBindings.questions' which is a non-empty string or object with a non-empty 'field'."
            );
        }

        return new LikertComponent
        {
            Id = ParseId(componentElement),
            Type = ParseType(componentElement),
            PageId = pageId,
            LayoutId = layoutId,
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = dataModelBindings,
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // RowFilter = ParseRowFilter(componentElement),
        };
    }

    // private static RowFilter? ParseRowFilter(JsonElement componentElement)
    // {
    //     if (!componentElement.TryGetProperty("filter", out var filterElement))
    //     {
    //         return null;
    //     }

    //     int? start = null;
    //     int? stop = null;

    //     if (filterElement.ValueKind == JsonValueKind.Array)
    //     {
    //         foreach (var item in filterElement.EnumerateArray())
    //         {
    //             if (
    //                 item.ValueKind == JsonValueKind.Object
    //                 && item.TryGetProperty("key", out var keyProp)
    //                 && item.TryGetProperty("value", out var valueProp)
    //             )
    //             {
    //                 var key = keyProp.GetString();
    //                 if (key == "start")
    //                 {
    //                     if (valueProp.ValueKind == JsonValueKind.Number)
    //                     {
    //                         start = valueProp.GetInt32();
    //                     }
    //                     else if (
    //                         valueProp.ValueKind == JsonValueKind.String
    //                         && int.TryParse(valueProp.GetString(), out var startValue)
    //                     )
    //                     {
    //                         start = startValue;
    //                     }
    //                 }
    //                 else if (key == "stop")
    //                 {
    //                     if (valueProp.ValueKind == JsonValueKind.Number)
    //                     {
    //                         stop = valueProp.GetInt32();
    //                     }
    //                     else if (
    //                         valueProp.ValueKind == JsonValueKind.String
    //                         && int.TryParse(valueProp.GetString(), out var stopValue)
    //                     )
    //                     {
    //                         stop = stopValue;
    //                     }
    //                 }
    //             }
    //         }
    //     }

    //     // Only return a filter if both values are present and the range is valid
    //     if (start.HasValue && stop.HasValue && start.Value <= stop.Value)
    //     {
    //         return new RowFilter { Start = start.Value, Stop = stop.Value };
    //     }

    //     return null;
    // }
}

// /// <summary>
// /// Represents a filter for row indices in repeating components.
// /// Rows with indices less than <see cref="Start"/> or greater than <see cref="Stop"/> are hidden.
// /// </summary>
// internal sealed class RowFilter
// {
//     /// <summary>
//     /// The starting index (inclusive) of rows to show. Rows before this index are hidden.
//     /// </summary>
//     public required int Start { get; init; }

//     /// <summary>
//     /// The stopping index (inclusive) of rows to show. Rows after this index are hidden.
//     /// </summary>
//     public required int Stop { get; init; }

//     /// <summary>
//     /// Determines whether the specified row index is within the filter range.
//     /// </summary>
//     /// <param name="rowIndex">The zero-based index of the row to check.</param>
//     /// <returns>True if the row is within the filter range; false otherwise.</returns>
//     public bool IsInRange(int rowIndex)
//     {
//         return rowIndex >= Start && rowIndex <= Stop;
//     }
// }
