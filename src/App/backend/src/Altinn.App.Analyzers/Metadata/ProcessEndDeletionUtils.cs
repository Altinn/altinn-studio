using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Metadata;

/// <summary>
/// Checks that <c>applicationmetadata.json</c> does not both delete the instance when its process ends
/// (<c>autoDeleteOnProcessEnd</c>) and forbid deleting it for a number of days after it is archived
/// (<c>preventInstanceDeletionForDays</c>). Ending the process archives the instance, so the two settings
/// cannot both hold.
/// </summary>
internal static class ProcessEndDeletionUtils
{
    /// <summary>
    /// Appends a diagnostic when the given applicationmetadata.json combines the two settings.
    /// </summary>
    internal static void CollectDiagnostics(AdditionalText text, CancellationToken token, List<Diagnostic> diagnostics)
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

            var autoDelete = appMetadata.GetPropertyIgnoreCase("autoDeleteOnProcessEnd");
            if (autoDelete?.Type != JsonType.Boolean || !autoDelete.GetBool())
            {
                return;
            }

            var preventDays = appMetadata.GetPropertyIgnoreCase("preventInstanceDeletionForDays");
            if (preventDays?.Type != JsonType.Number || preventDays.GetNumber() <= 0)
            {
                return;
            }

            diagnostics.Add(
                Diagnostic.Create(
                    Diagnostics.Metadata.AutoDeleteWithDeletionPrevention,
                    FileLocationHelper.GetLocation(text, preventDays.Start, preventDays.End),
                    preventDays.GetNumber()
                )
            );
        }
        catch (NanoJsonException)
        {
            // Malformed JSON is reported by the FormDataWrapperAnalyzer (ALTINNAPP0002).
        }
    }
}
