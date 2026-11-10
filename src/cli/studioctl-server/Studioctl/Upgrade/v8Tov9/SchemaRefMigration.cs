using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record SchemaRefMigrationResult(int ReferencesUpdated, IReadOnlyList<string> Warnings);

/// <summary>
/// Points the <c>$schema</c> of every JSON file in the app from altinncdn.no to app-dist, at the Altinn.App
/// package version, for every schema app-dist publishes. Others, such as prefill, stay on altinncdn.no.
/// The URL alone decides the rewrite, so a file's location does not matter.
/// </summary>
internal static partial class SchemaRefMigration
{
    /// <summary>
    /// The schemas app-dist publishes, relative to <c>schemas/json/</c>. Keep in sync with
    /// <c>Altinn.Studio.AppDist.JsonSchemaPaths</c>, which could be referenced here instead in the future.
    /// </summary>
    private static readonly HashSet<string> _publishedSchemas = new(StringComparer.Ordinal)
    {
        "application/application-metadata.schema.v1.json",
        "component/number-format.schema.v1.json",
        "layout/expression.schema.v1.json",
        "layout/footer.schema.v1.json",
        "layout/layout.schema.v1.json",
        "layout/layoutSettings.schema.v1.json",
        "text-resources/text-resources.schema.v1.json",
        "validation/validation.schema.v1.json",
    };

    private static readonly JsonReaderOptions _readerOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    [GeneratedRegex(
        @"^https://altinncdn\.no/(?<toolkit>toolkits/altinn-app-frontend/[^/]+/)?schemas/json/(?<schema>.+)$"
    )]
    private static partial Regex AltinnCdnSchemaUrl();

    public static async Task<SchemaRefMigrationResult> Migrate(string projectFolder, string version)
    {
        var warnings = new List<string>();
        var appFolder = Path.Combine(projectFolder, "App");

        var updated = 0;
        foreach (var file in JsonFiles(appFolder))
        {
            var displayPath = Path.GetRelativePath(appFolder, file).Replace(Path.DirectorySeparatorChar, '/');

            // Only a file mentioning a schema path can need a rewrite, so an unrelated broken file is not reported.
            var json = await File.ReadAllBytesAsync(file);
            if (json.AsSpan().IndexOf("/schemas/json/"u8) < 0)
                continue;

            SchemaValue? schema;
            try
            {
                schema = FindSchema(json);
            }
            catch (JsonException ex)
            {
                warnings.Add($"Could not read {displayPath} ({ex.Message}); left its $schema unchanged.");
                continue;
            }

            if (schema is null || AltinnCdnSchemaUrl().Match(schema.Url) is not { Success: true } match)
                continue;

            var schemaPath = match.Groups["schema"].Value;
            if (!_publishedSchemas.Contains(schemaPath))
            {
                // Unversioned altinncdn.no schemas outside the app frontend (prefill, test users) stay there.
                if (match.Groups["toolkit"].Success)
                    warnings.Add(
                        $"Left $schema {schema.Url} unchanged in {displayPath}: app-dist {version} does not publish it."
                    );
                continue;
            }

            // Only the value's bytes change, so the rest of the file is written back exactly as it was read.
            var replacement = Encoding.UTF8.GetBytes($"\"{AppDistUrl(version)}/schemas/json/{schemaPath}\"");
            await File.WriteAllBytesAsync(
                file,
                [.. json.AsSpan(0, schema.Start), .. replacement, .. json.AsSpan(schema.Start + schema.Length)]
            );
            updated++;
        }

        return new SchemaRefMigrationResult(updated, warnings);
    }

    public static string AppDistUrl(string version) => $"https://altinn.studio/designer/app-dist/{version}";

    /// <summary>Every JSON file under the app folder except build output, in a stable order.</summary>
    private static IEnumerable<string> JsonFiles(string appFolder) =>
        Directory
            .EnumerateFiles(appFolder, "*.json", SearchOption.AllDirectories)
            .Where(file => !BuildOutputPaths.IsBuildOutput(Path.GetRelativePath(appFolder, file)))
            .Order(StringComparer.Ordinal);

    /// <summary>
    /// Finds the string value of the root object's <c>$schema</c> property, with the byte range of the quoted
    /// value as written, escapes included.
    /// </summary>
    private static SchemaValue? FindSchema(byte[] json)
    {
        var bomLength = json.AsSpan().StartsWith(Encoding.UTF8.Preamble) ? Encoding.UTF8.Preamble.Length : 0;
        var reader = new Utf8JsonReader(json.AsSpan(bomLength), _readerOptions);
        while (reader.Read())
        {
            if (
                reader.TokenType != JsonTokenType.PropertyName
                || reader.CurrentDepth != 1
                || !reader.ValueTextEquals("$schema"u8)
            )
                continue;

            return reader.Read() && reader.TokenType == JsonTokenType.String && reader.GetString() is { } url
                ? new SchemaValue(url, bomLength + (int)reader.TokenStartIndex, reader.ValueSpan.Length + 2)
                : null;
        }

        return null;
    }

    private sealed record SchemaValue(string Url, int Start, int Length);
}
