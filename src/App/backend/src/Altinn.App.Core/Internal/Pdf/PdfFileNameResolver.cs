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
    /// Gets a sanitized PDF file name from the configured text resource, falling back to the default name.
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

        string? fileName = customFileNameTextResourceKey is null
            ? null
            : await translationService.TranslateTextKey(customFileNameTextResourceKey, dataAccessor, componentContext);

        // A custom key that no text resource has gets the default file name too
        if (string.IsNullOrEmpty(fileName))
        {
            fileName = await translationService.TranslateTextKey(
                BuiltInTextResources.PdfDefaultFileName.Key,
                dataAccessor,
                componentContext
            );
        }

        if (string.IsNullOrEmpty(fileName))
        {
            throw new InvalidOperationException(
                "The default PDF file name is empty, though the translation service has a fallback for it"
            );
        }

        fileName = fileName.AsFileName(false);
        return fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? fileName : $"{fileName}.pdf";
    }
}
