using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Calculation;

/// <summary>
/// The calculations in a data type's <c>models/{dataTypeId}.calculation.json</c>
/// </summary>
public class CalculationConfig : IJsonOnDeserialized
{
    /// <summary>
    /// The JSON schema that describes the calculation configuration file.
    /// </summary>
    public const string Schema =
        "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/calculation/calculation.schema.v1.json";

    /// <summary>
    /// Gets or sets the list of calculation items in the calculation configuration.
    /// </summary>
    [JsonPropertyName("calculations")]
    public required List<CalculationItem> Calculations { get; init; }

    void IJsonOnDeserialized.OnDeserialized()
    {
        // required only ensures that the property is present, not that it is non-null
        if (Calculations is null)
        {
            throw new JsonException("\"calculations\" must be an array");
        }
        if (Calculations.Exists(item => item is null))
        {
            throw new JsonException("\"calculations\" must not contain null");
        }
    }
}
