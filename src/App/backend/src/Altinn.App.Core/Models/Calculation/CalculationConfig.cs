using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.App;

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

    private static readonly JsonSerializerOptions _serializerOptions = AppFileJson.CreateSerializerOptions(
        new() { PropertyNameCaseInsensitive = true }
    );

    /// <summary>
    /// Gets or sets the list of calculation items in the calculation configuration.
    /// </summary>
    [JsonPropertyName("calculations")]
    public required List<CalculationItem> Calculations { get; init; }

    /// <summary>
    /// Parses a <c>models/{dataTypeId}.calculation.json</c> file with the app file JSON grammar, which allows
    /// comments and trailing commas.
    /// </summary>
    /// <param name="json">The contents of the file, without a byte order mark.</param>
    /// <param name="relativePath">The path of the file in the app, which starts the message of every error.</param>
    /// <exception cref="JsonException">When the file is not a valid calculation configuration.</exception>
    internal static CalculationConfig Parse(ReadOnlyMemory<byte> json, string relativePath)
    {
        try
        {
            if (HasCalculationsObject(json))
            {
                throw new JsonException(
                    "\"calculations\" is an object keyed by field, which is the v8 format. In v9 it is a list of "
                        + "{ \"field\", \"expression\" } items. Run studioctl app upgrade v9 to convert the file."
                );
            }

            return JsonSerializer.Deserialize<CalculationConfig>(json.Span, _serializerOptions)
                ?? throw new JsonException("The calculation configuration is null");
        }
        catch (JsonException e)
        {
            throw new JsonException($"{relativePath}: {e.Message}", e);
        }
    }

    /// <summary>
    /// Whether "calculations" is an object keyed by field name, as it was in v8.
    /// </summary>
    private static bool HasCalculationsObject(ReadOnlyMemory<byte> json)
    {
        using var document = JsonDocument.Parse(json, AppFileJson.DocumentOptions);
        if (document.RootElement.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        foreach (var property in document.RootElement.EnumerateObject())
        {
            if (string.Equals(property.Name, "calculations", StringComparison.OrdinalIgnoreCase))
            {
                return property.Value.ValueKind == JsonValueKind.Object;
            }
        }

        return false;
    }

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
