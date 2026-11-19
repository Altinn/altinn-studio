using System.Text.Json;

namespace WorkflowEngine.Data;

/// <summary>
/// The <c>collection_changed</c> notification: a hint that what <c>GetCollection</c> returns for one collection may
/// have changed.
/// </summary>
/// <remarks>
/// The payload is the JSON array <c>[namespace, key]</c>, so any characters round-trip unambiguously. Both columns
/// are <c>varchar(200)</c> and the default encoder writes at most 12 bytes per code point, so a payload stays below
/// PostgreSQL's 8000-byte limit, which would otherwise fail the writing transaction.
/// </remarks>
internal static class CollectionChangedNotification
{
    public const string Channel = "collection_changed";

    public static string Encode(CollectionId collection) =>
        JsonSerializer.Serialize<string[]>([collection.Namespace, collection.Key]);

    public static bool TryDecode(string payload, out CollectionId collection)
    {
        collection = default;
        string[]? parts;
        try
        {
            parts = JsonSerializer.Deserialize<string[]>(payload);
        }
        catch (JsonException)
        {
            return false;
        }

        if (parts is not [{ } ns, { } key])
            return false;

        collection = new CollectionId(ns, key);
        return true;
    }
}
