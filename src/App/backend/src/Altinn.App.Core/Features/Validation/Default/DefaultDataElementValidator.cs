using System.Globalization;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Default validations that run on all data elements to validate metadata and file scan results.
/// </summary>
internal sealed class DefaultDataElementValidator : IDataElementValidator //TODO: This should implement IValidator
{
    /// <summary>
    /// Run validations on all data elements
    /// </summary>
    public string DataType => "*";

    /// <inheritdoc />
    public Task<List<ValidationIssue>> ValidateDataElement(
        Instance instance,
        DataElement dataElement,
        DataType dataType,
        string? language
    )
    {
        var issues = new List<ValidationIssue>();
        if (dataElement.ContentType == null)
        {
            issues.Add(
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.MissingContentType,
                    DataElementId = dataElement.Id,
                    Severity = ValidationIssueSeverity.Error,
                    CustomTextKey = "backend.validation_errors.missing_content_type",
                    CustomTextParameters = FileTextParameters(dataElement, dataType),
                }
            );
        }
        else
        {
            var contentTypeWithoutEncoding = dataElement.ContentType.Split(";")[0];

            if (
                dataType.AllowedContentTypes != null
                && dataType.AllowedContentTypes.Count > 0
                && dataType.AllowedContentTypes.TrueForAll(cancellationToken =>
                    !cancellationToken.Equals(contentTypeWithoutEncoding, StringComparison.OrdinalIgnoreCase)
                )
            )
            {
                var parameters = FileTextParameters(dataElement, dataType);
                parameters["contentType"] = contentTypeWithoutEncoding;
                parameters["allowedContentTypes"] = string.Join(", ", dataType.AllowedContentTypes);
                issues.Add(
                    new ValidationIssue
                    {
                        DataElementId = dataElement.Id,
                        Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                        Severity = ValidationIssueSeverity.Error,
                        CustomTextKey = "altinn.standard_validation.file_content_type_not_allowed",
                        CustomTextParameters = parameters,
                        Field = dataType.Id,
                    }
                );
            }
        }

        if (
            dataType.MaxSize.HasValue
            && dataType.MaxSize > 0
            && (long)dataType.MaxSize * 1024 * 1024 < dataElement.Size
        )
        {
            var parameters = FileTextParameters(dataElement, dataType);
            parameters["maxSize"] = dataType.MaxSize.Value.ToString(CultureInfo.InvariantCulture);
            issues.Add(
                new ValidationIssue
                {
                    DataElementId = dataElement.Id,
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Severity = ValidationIssueSeverity.Error,
                    CustomTextKey = "backend.validation_errors.file_too_large",
                    CustomTextParameters = parameters,
                    Field = dataType.Id,
                }
            );
        }

        if (dataType.EnableFileScan && dataElement.FileScanResult == FileScanResult.Infected)
        {
            issues.Add(
                new ValidationIssue
                {
                    DataElementId = dataElement.Id,
                    Code = ValidationIssueCodes.DataElementCodes.DataElementFileInfected,
                    Severity = ValidationIssueSeverity.Error,
                    CustomTextKey = "backend.validation_errors.file_infected",
                    CustomTextParameters = FileTextParameters(dataElement, dataType),
                    Field = dataType.Id,
                }
            );
        }

        if (
            dataType.EnableFileScan
            && dataType.ValidationErrorOnPendingFileScan
            && dataElement.FileScanResult == FileScanResult.Pending
        )
        {
            issues.Add(
                new ValidationIssue
                {
                    DataElementId = dataElement.Id,
                    Code = ValidationIssueCodes.DataElementCodes.DataElementFileScanPending,
                    Severity = ValidationIssueSeverity.Error,
                    CustomTextKey = "backend.validation_errors.file_scan_pending",
                    CustomTextParameters = FileTextParameters(dataElement, dataType),
                    Field = dataType.Id,
                }
            );
        }

        return Task.FromResult(issues);
    }

    /// <summary>
    /// Text parameters that identify the file, so that apps can name it in their own texts for these issues.
    /// </summary>
    private static Dictionary<string, string> FileTextParameters(DataElement dataElement, DataType dataType) =>
        new() { ["filename"] = dataElement.Filename ?? "", ["dataType"] = dataType.Id };
}
