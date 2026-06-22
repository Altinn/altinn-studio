using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Deprecations;

/// <summary>
/// Parses <c>applicationmetadata.json</c> and reports use of configuration that is no longer
/// supported by this version of the app backend (see <see cref="Diagnostics.Deprecations"/>).
/// </summary>
public static class MetadataDeprecationUtils
{
    /// <summary>
    /// Inspects the given applicationmetadata.json file and appends a diagnostic for each
    /// deprecated property found.
    /// </summary>
    public static void CollectDeprecationDiagnostics(
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

            CollectEnablePdfCreation(text, appMetadata, diagnostics);
            CollectLegacyEFormidling(text, appMetadata, diagnostics);
        }
        catch (NanoJsonException)
        {
            // Malformed JSON is reported by the FormDataWrapperAnalyzer (ALTINNAPP0002).
        }
    }

    private static void CollectEnablePdfCreation(
        AdditionalText text,
        JsonValue appMetadata,
        List<Diagnostic> diagnostics
    )
    {
        var dataTypes = appMetadata.GetProperty("dataTypes");
        if (dataTypes?.Type != JsonType.Array)
        {
            return;
        }

        foreach (var dataType in dataTypes.GetArrayValues())
        {
            if (dataType.Type != JsonType.Object)
            {
                continue;
            }

            var enablePdfCreation = dataType.GetProperty("enablePdfCreation");
            if (enablePdfCreation?.Type != JsonType.Boolean || !enablePdfCreation.GetBool())
            {
                continue;
            }

            var id = dataType.GetProperty("id");
            var idText = id?.Type == JsonType.String ? id.GetString() : "<unknown>";

            diagnostics.Add(
                Diagnostic.Create(
                    Diagnostics.Deprecations.EnablePdfCreation,
                    FileLocationHelper.GetLocation(text, enablePdfCreation.Start, enablePdfCreation.End),
                    idText
                )
            );
        }
    }

    private static void CollectLegacyEFormidling(
        AdditionalText text,
        JsonValue appMetadata,
        List<Diagnostic> diagnostics
    )
    {
        var eFormidling = appMetadata.GetProperty("eFormidling");
        if (eFormidling is null || eFormidling.Type == JsonType.Null)
        {
            return;
        }

        diagnostics.Add(
            Diagnostic.Create(
                Diagnostics.Deprecations.LegacyEFormidling,
                FileLocationHelper.GetLocation(text, eFormidling.Start, eFormidling.End)
            )
        );
    }
}
