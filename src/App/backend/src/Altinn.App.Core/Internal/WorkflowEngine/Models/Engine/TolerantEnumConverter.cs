using System.Collections.Frozen;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Reads one of the engine's enums by name, and reads a name this version does not know as the enum's
/// <c>Unknown</c> member instead of failing the read.
/// </summary>
/// <remarks>
/// The engine deploys ahead of released apps, so it can send a value added after this version was built. A strict
/// read would fail every read of a workflow that has the value. The code that reads the enum decides what
/// <c>Unknown</c> means there: a workflow or step with an unknown status counts as still running, never as failed or
/// completed. <c>Unknown</c> is the app's own member. The wire contract test leaves it out when it compares the enum
/// with the engine's, and finds this converter by its name to do so.
/// </remarks>
internal sealed class TolerantEnumConverter<TEnum> : JsonConverter<TEnum>
    where TEnum : struct, Enum
{
    private const string UnknownName = "Unknown";

    // Case-insensitive, as JsonStringEnumConverter reads.
    private static readonly FrozenDictionary<string, TEnum> _known = Enum.GetNames<TEnum>()
        .Where(name => name != UnknownName)
        .ToFrozenDictionary(name => name, Enum.Parse<TEnum>, StringComparer.OrdinalIgnoreCase);

    private readonly TEnum _unknown;

    public TolerantEnumConverter()
    {
        if (!Enum.TryParse(UnknownName, ignoreCase: false, out _unknown))
        {
            throw new InvalidOperationException(
                $"{typeof(TEnum).Name} has no {UnknownName} member to read a value this version does not know as."
            );
        }
    }

    public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException($"Expected {typeof(TEnum).Name} as a string, got {reader.TokenType}.");
        }

        string name = reader.GetString() ?? string.Empty;
        if (_known.TryGetValue(name, out TEnum value))
        {
            return value;
        }

        UnknownEngineValues.Shared.Record(typeof(TEnum).Name, name);
        return _unknown;
    }

    // Writes Unknown as its name rather than refusing it. No request body the app sends to the engine holds these
    // enums, and Swashbuckle serializes every member to describe the enum in the OpenAPI document.
    public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString());
}
