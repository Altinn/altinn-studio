using System.Text;
using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// The data values and presentation texts the app's <c>applicationmetadata.json</c> derives from form fields
/// (<c>dataFields</c>, <c>presentationFields</c>), by id with the field's path. v9's mutator refuses to set them
/// directly.
/// </summary>
internal sealed record DerivedFields(
    IReadOnlyDictionary<string, string> DataFields,
    IReadOnlyDictionary<string, string> PresentationFields
)
{
    public static readonly DerivedFields None = new(
        new Dictionary<string, string>(StringComparer.Ordinal),
        new Dictionary<string, string>(StringComparer.Ordinal)
    );

    private static readonly JsonDocumentOptions _jsonOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    /// <summary>The fields of the app in <paramref name="projectFolder"/>; none when the metadata cannot be read.</summary>
    public static DerivedFields Read(string projectFolder)
    {
        try
        {
            var path = Path.Combine(projectFolder, "config", "applicationmetadata.json");
            using var document = JsonDocument.Parse(Utf8TextFile.Decode(File.ReadAllBytes(path)).Text, _jsonOptions);
            return document.RootElement.ValueKind == JsonValueKind.Object
                ? new DerivedFields(
                    Fields(document.RootElement, "dataFields"),
                    Fields(document.RootElement, "presentationFields")
                )
                : None;
        }
        catch (Exception ex)
            when (ex is IOException or UnauthorizedAccessException or DecoderFallbackException or JsonException)
        {
            return None;
        }
    }

    private static Dictionary<string, string> Fields(JsonElement root, string property)
    {
        var fields = new Dictionary<string, string>(StringComparer.Ordinal);
        if (!root.TryGetProperty(property, out var array) || array.ValueKind != JsonValueKind.Array)
        {
            return fields;
        }

        foreach (var field in array.EnumerateArray())
        {
            if (
                field.ValueKind == JsonValueKind.Object
                && field.TryGetProperty("id", out var id)
                && id.ValueKind == JsonValueKind.String
                && id.GetString() is { } key
            )
            {
                fields.TryAdd(
                    key,
                    field.TryGetProperty("path", out var fieldPath) && fieldPath.ValueKind == JsonValueKind.String
                        ? fieldPath.GetString() ?? ""
                        : ""
                );
            }
        }

        return fields;
    }
}
