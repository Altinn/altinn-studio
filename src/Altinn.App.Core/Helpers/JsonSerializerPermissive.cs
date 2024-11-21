using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Wrapper of <see cref="JsonSerializer"/> with permissive settings parsing settings.
/// </summary>
public static class JsonSerializerPermissive
{
    /// <summary>
    /// <see cref="JsonSerializerOptions"/> for the most permissive parsing of JSON.
    /// </summary>
    public static readonly JsonSerializerOptions JsonSerializerOptionsDefaults = new(JsonSerializerDefaults.Web)
    {
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        Converters = { new JsonStringEnumConverter() },
    };

    /// <summary>
    /// Simple wrapper of <see cref="JsonSerializer.Deserialize{TValue}(string, JsonSerializerOptions?)"/> with permissive defaults.
    /// </summary>
    public static T Deserialize<T>(string content)
    {
        return JsonSerializer.Deserialize<T>(content, JsonSerializerOptionsDefaults)
            ?? throw new JsonException("Could not deserialize json value \"null\" to type " + typeof(T).FullName);
    }

    /// <summary>
    /// Simple wrapper of <see cref="JsonSerializer.DeserializeAsync{TValue}(Stream, JsonSerializerOptions, CancellationToken)"/> with permissive defaults.
    /// </summary>
    public static async Task<T> DeserializeAsync<T>(HttpContent content, CancellationToken cancellationToken = default)
    {
        await using var stream = await content.ReadAsStreamAsync(cancellationToken);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonSerializerOptionsDefaults, cancellationToken)
            ?? throw new JsonException("Could not deserialize json value \"null\" to type " + typeof(T).FullName);
    }

    /// <summary>
    /// Simple wrapper of <see cref="JsonSerializer.Serialize{TValue}(TValue, JsonSerializerOptions?)"/> with permissive defaults.
    /// </summary>
    public static string Serialize(PartyLookup partyLookup)
    {
        return JsonSerializer.Serialize(partyLookup, JsonSerializerOptionsDefaults);
    }
}
