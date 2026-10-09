using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.FileAnalyzers.MimeType;

internal sealed class MimeTypeValidator : IFileValidator
{
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
            ) && !dataType.AllowedContentTypes.Contains("application/octet-stream")
        )
        {
            ValidationIssue error = new()
            {
                Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                Severity = ValidationIssueSeverity.Error,
                CustomTextKey = "altinn.standard_validation.file_content_type_not_allowed",
                CustomTextParameters = new Dictionary<string, string>
                {
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
}
