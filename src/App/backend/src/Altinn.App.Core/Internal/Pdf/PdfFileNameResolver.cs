using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Gets the file name for a PDF from the app's text resources.
/// </summary>
internal static class PdfFileNameResolver
{
    /// <summary>
    /// Gets a sanitized PDF file name from the configured text resource, or the default resource when none is configured.
    /// Uses the data accessor's language and, for subforms, the specified data element for variables.
    /// </summary>
    public static async Task<string> GetFileName(
        ITranslationService translationService,
        IInstanceDataAccessor dataAccessor,
        string? customFileNameTextResourceKey = null,
        SubformPdfContext? subformPdfContext = null
    )
    {
        // A subform PDF fills in the variables of its file name from the subform's data
        var componentContext = new ComponentContext(
            dataAccessor,
            component: null,
            rowIndices: null,
            dataElementIdentifier: subformPdfContext is null
                ? (DataElementIdentifier?)null
                : new DataElementIdentifier(subformPdfContext.DataElementId)
        );

        string fileNameTextResourceKey = customFileNameTextResourceKey ?? BuiltInTextResources.PdfDefaultFileName.Key;
        string? fileName = await translationService.TranslateTextKey(
            fileNameTextResourceKey,
            dataAccessor,
            componentContext
        );

        if (string.IsNullOrEmpty(fileName))
        {
            throw new InvalidOperationException(
                $"The PDF file name text resource '{fileNameTextResourceKey}' is missing or empty."
            );
        }

        fileName = fileName.AsFileName(false);
        return fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? fileName : $"{fileName}.pdf";
    }
}
