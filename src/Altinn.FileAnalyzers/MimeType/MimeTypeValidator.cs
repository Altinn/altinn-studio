using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.FileAnalyzers.MimeType;

/// <summary>
/// Validates that the file is of the allowed content type
/// </summary>
public class MimeTypeValidator : IFileValidator
{
    /// <summary>
    /// The unique identifier for the validator to be used when enabling it from config.
    /// </summary>
    public string Id { get; private set; } = "mimeTypeValidator";

    /// <summary>
    /// Validates that the file is of the allowed content type.
    /// </summary>
#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously. Suppressed because of the interface.
    public async Task<(bool Success, IEnumerable<ValidationIssue> Errors)> Validate(DataType dataType, IEnumerable<FileAnalysisResult> fileAnalysisResults)
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
    {
        List<ValidationIssue> errors = new();

        var fileMimeTypeResult = fileAnalysisResults.FirstOrDefault(x => x.MimeType != null);

        // Verify that file mime type is an allowed content-type
        if (!dataType.AllowedContentTypes.Contains(fileMimeTypeResult?.MimeType, StringComparer.InvariantCultureIgnoreCase) && !dataType.AllowedContentTypes.Contains("application/octet-stream"))
        {
            ValidationIssue error = new()
            {
                Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                Severity = ValidationIssueSeverity.Error,
                Description = $"The {fileMimeTypeResult?.Filename + " "}file does not appear to be of the allowed content type according to the configuration for data type {dataType.Id}. Allowed content types are {string.Join(", ", dataType.AllowedContentTypes)}"
            };

            errors.Add(error);

            return (false, errors);
        }

        return (true, errors);
    }
}
