using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Gets the file name for a PDF from the app's text resources.
/// </summary>
internal sealed class PdfFileNameResolver(
    IHttpContextAccessor httpContextAccessor,
    IAuthenticationContext authenticationContext,
    ITranslationService translationService
) : IPdfFileNameResolver
{
    /// <inheritdoc/>
    public async Task<string> GetFileName(
        IInstanceDataAccessor dataAccessor,
        string? customFileNameTextResourceKey = null,
        SubformPdfContext? subformPdfContext = null
    )
    {
        string? fileName;

        if (customFileNameTextResourceKey != null)
        {
            fileName = await GetVariableSubstitutedFileName(
                dataAccessor,
                customFileNameTextResourceKey,
                subformPdfContext?.DataElementId
            );
        }
        else
        {
            // Fall back to simple translation without variable substitution, in the language of the PDF
            string language =
                PdfService.GetOverriddenLanguage(httpContextAccessor.HttpContext?.Request.Query)
                ?? await authenticationContext.Current.GetLanguage();
            fileName = await translationService.TranslateTextKey("backend.pdf_default_file_name", language);
        }

        if (string.IsNullOrEmpty(fileName))
        {
            // translation for backend.pdf_default_file_name should always be present (it has a fallback in the translation service),
            // but just in case, we default to a hardcoded string.
            fileName = "Altinn PDF.pdf";
        }

        fileName = fileName.AsFileName(false);
        return fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? fileName : $"{fileName}.pdf";
    }

    private async Task<string?> GetVariableSubstitutedFileName(
        IInstanceDataAccessor dataAccessor,
        string customFileNameTextResourceKey,
        string? subformDataElementId
    )
    {
        DataElementIdentifier? dataElementIdentifier =
            subformDataElementId != null
                ? new DataElementIdentifier(subformDataElementId)
                : (DataElementIdentifier?)null;

        var componentContext = new ComponentContext(
            dataAccessor,
            component: null,
            rowIndices: null,
            dataElementIdentifier: dataElementIdentifier
        );

        return await translationService.TranslateTextKey(customFileNameTextResourceKey, dataAccessor, componentContext);
    }
}
