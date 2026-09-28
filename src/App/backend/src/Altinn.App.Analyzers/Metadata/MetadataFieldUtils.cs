using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Metadata;

/// <summary>
/// Checks the <c>presentationFields</c> and <c>dataFields</c> collections in
/// <c>applicationmetadata.json</c>. Each collection is computed into a flat map on the instance keyed by
/// the entries' <c>id</c> — <c>presentationTexts</c> and <c>dataValues</c> respectively — and the values
/// for one data type are computed in a single pass, into a dictionary that rejects a repeated key. So two
/// entries sharing an <c>id</c> <i>on the same</i> <c>dataTypeId</c> fail the app outright, and reporting
/// that at build time puts it in front of the person editing the file rather than the first user to open
/// the app.
/// <para>
/// Sharing an <c>id</c> across <i>different</i> data types is deliberately not reported. It resolves to
/// last-writer-wins rather than a failure, and apps in production use it on purpose: one presentation
/// slot ("the company name") fed from whichever of several models an instance actually carries.
/// </para>
/// </summary>
internal static class MetadataFieldUtils
{
    private const string PresentationFields = "presentationFields";
    private const string DataFields = "dataFields";

    /// <summary>
    /// Inspects the field collections in the given applicationmetadata.json file and appends a
    /// diagnostic for each unusable duplicate id and each reference to an undeclared data type.
    /// </summary>
    internal static void CollectFieldDiagnostics(
        AdditionalText text,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        string? textContent = text.GetText(token)?.ToString();
        if (textContent is null)
        {
            return;
        }

        try
        {
            var appMetadata = JsonValue.Parse(textContent);
            if (appMetadata.Type != JsonType.Object)
            {
                // Structural errors are reported by the FormDataWrapperAnalyzer (ALTINNAPP0002).
                return;
            }

            var declaredDataTypeIds = GetDeclaredDataTypeIds(appMetadata);
            CollectForCollection(text, appMetadata, PresentationFields, declaredDataTypeIds, diagnostics);
            CollectForCollection(text, appMetadata, DataFields, declaredDataTypeIds, diagnostics);
        }
        catch (NanoJsonException)
        {
            // Malformed JSON is reported by the FormDataWrapperAnalyzer (ALTINNAPP0002).
        }
    }

    private static void CollectForCollection(
        AdditionalText text,
        JsonValue appMetadata,
        string collectionName,
        List<string> declaredDataTypeIds,
        List<Diagnostic> diagnostics
    )
    {
        var collection = appMetadata.GetPropertyIgnoreCase(collectionName);
        if (collection?.Type != JsonType.Array)
        {
            return;
        }

        // Keyed by the pair the runtime collides on, holding the path of the entry that claimed it
        // first so the diagnostic can name both sides rather than only the one it points at. Ids
        // compare case-sensitively, as the instance dictionaries do.
        var firstPathByKey = new Dictionary<(string Id, string DataTypeId), string>();

        foreach (var entry in collection.GetArrayValues())
        {
            if (entry.Type != JsonType.Object)
            {
                continue;
            }

            var id = entry.GetPropertyIgnoreCase("id");
            if (id?.Type != JsonType.String)
            {
                // An entry without a usable id is never computed, and is a structural problem rather
                // than a collision.
                continue;
            }

            var dataTypeId = entry.GetPropertyIgnoreCase("dataTypeId");
            if (dataTypeId?.Type != JsonType.String)
            {
                // Nothing matches an entry with no data type, so it is never computed and cannot
                // collide. The obsolete textResource/value/taskIds shape lands here.
                continue;
            }

            var idText = id.GetString();
            var dataTypeIdText = dataTypeId.GetString();
            var pathText = GetStringOrDefault(entry, "path", "<no path>");

            if (firstPathByKey.TryGetValue((idText, dataTypeIdText), out var firstPath))
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Metadata.DuplicateFieldId,
                        FileLocationHelper.GetLocation(text, id.Start, id.End),
                        collectionName,
                        idText,
                        dataTypeIdText,
                        firstPath,
                        pathText
                    )
                );
            }
            else
            {
                firstPathByKey.Add((idText, dataTypeIdText), pathText);
            }

            if (!declaredDataTypeIds.Contains(dataTypeIdText, StringComparer.Ordinal))
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Metadata.UnknownFieldDataType,
                        FileLocationHelper.GetLocation(text, dataTypeId.Start, dataTypeId.End),
                        collectionName,
                        idText,
                        dataTypeIdText
                    )
                );
            }
        }
    }

    private static List<string> GetDeclaredDataTypeIds(JsonValue appMetadata)
    {
        var ids = new List<string>();

        var dataTypes = appMetadata.GetPropertyIgnoreCase("dataTypes");
        if (dataTypes?.Type != JsonType.Array)
        {
            return ids;
        }

        foreach (var dataType in dataTypes.GetArrayValues())
        {
            if (dataType.Type != JsonType.Object)
            {
                continue;
            }

            var id = dataType.GetPropertyIgnoreCase("id");
            if (id?.Type == JsonType.String)
            {
                ids.Add(id.GetString());
            }
        }

        return ids;
    }

    private static string GetStringOrDefault(JsonValue entry, string propertyName, string fallback)
    {
        var value = entry.GetPropertyIgnoreCase(propertyName);
        return value?.Type == JsonType.String ? value.GetString() : fallback;
    }
}
