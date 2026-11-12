using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Calculation;

/// <summary>
/// Calculation item in the calculation configuration
/// </summary>
public class CalculationItem : IJsonOnDeserialized
{
    /// <summary>
    /// The base field to be calculated.
    /// Note that missing indexes will be added to the field name when calculating array items. For example, if the field is "myArray[].myField", the calculation will be applied to all items in the array.
    /// </summary>
    [JsonPropertyName("field")]
    public required string Field { get; init; }

    /// <summary>
    /// The expression to be used for the calculation. Note that this will be run in the context of the field, so you can use relative paths in the expression.
    /// </summary>
    /// <remarks>
    /// An object result sets the properties it contains and leaves the others untouched (<c>altinnRowId</c> is never
    /// written). A list of objects is merged row by row: the field gets as many rows as the result, and existing
    /// rows keep their row id and the properties the result leaves out. Other values replace the field.
    /// </remarks>
    [JsonPropertyName("expression")]
    public required Expression Expression { get; init; }

    void IJsonOnDeserialized.OnDeserialized()
    {
        // required only ensures that the property is present, not that it is non-null
        if (string.IsNullOrWhiteSpace(Field))
        {
            throw new JsonException("\"field\" must be a non-empty string");
        }
    }
}
