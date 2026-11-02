using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.FileAnalyzers.MimeType;

internal sealed class MimeTypeValidator : IFileValidator
{
    // Altinn.App.Core owns the default texts and the parameters for this key, in
    // BuiltInValidationIssues.ContentTypeNotAllowedDefinition. Keep the parameters below in line with it.
    private const string ContentTypeNotAllowedTextKey =
        "validation_errors.file_content_type_not_allowed";

    /// <inheritDoc/>
    public string Id { get; private set; } = "mimeTypeValidator";

    /// <inheritDoc/>
    public Task<(bool Success, IEnumerable<ValidationIssue> Errors)> Validate(
        DataType dataType,
        IEnumerable<FileAnalysisResult> fileAnalysisResults
    )
    {
        List<ValidationIssue> errors = new();

        var fileMimeTypeResult = fileAnalysisResults.FirstOrDefault(x => x.MimeType is not null);

        // Verify that file mime type is an allowed content-type
        if (
            !dataType.AllowedContentTypes.Contains(
                fileMimeTypeResult?.MimeType,
                StringComparer.InvariantCultureIgnoreCase
            )
            && !dataType.AllowedContentTypes.Contains("application/octet-stream")
            && !IsAllowedByFileExtension(dataType, fileMimeTypeResult)
        )
        {
            ValidationIssue error = new()
            {
                Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                Severity = ValidationIssueSeverity.Error,
                CustomTextKey = ContentTypeNotAllowedTextKey,
                CustomTextParameters = new Dictionary<string, string>
                {
                    ["filename"] = fileMimeTypeResult?.Filename ?? "",
                    ["dataType"] = dataType.Id,
                    ["contentType"] = fileMimeTypeResult?.MimeType ?? "",
                    ["allowedContentTypes"] = string.Join(", ", dataType.AllowedContentTypes),
                },
            };

            errors.Add(error);

            return Task.FromResult<(bool Success, IEnumerable<ValidationIssue> Errors)>(
                (false, errors)
            );
        }

        return Task.FromResult<(bool Success, IEnumerable<ValidationIssue> Errors)>((true, errors));
    }

    /// <summary>
    /// Whether the content matches the file's own extension, and a content type for that extension is allowed.
    /// The content inspector names some types differently from <see cref="MimeTypeMap"/>, which the upload check
    /// and Studio use, such as application/excel for .xls, so its MIME type alone rejects files that are what they say.
    /// </summary>
    private static bool IsAllowedByFileExtension(
        DataType dataType,
        FileAnalysisResult? analysisResult
    )
    {
        string extension = Path.GetExtension(analysisResult?.Filename ?? string.Empty)
            .TrimStart('.');
        if (
            analysisResult?.Extensions.Contains(
                extension,
                StringComparer.InvariantCultureIgnoreCase
            ) != true
        )
        {
            return false;
        }

        var contentTypesForExtension = MimeTypeMap.GetMimeType(extension);
        return dataType.AllowedContentTypes.Any(allowed =>
            contentTypesForExtension.IsMatch(allowed)
        );
    }
}
