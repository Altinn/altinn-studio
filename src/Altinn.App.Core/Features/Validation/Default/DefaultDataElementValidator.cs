using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Default validations that run on all data elements to validate metadata and file scan results.
/// </summary>
public class DefaultDataElementValidator : IDataElementValidator //TODO: This should implemnt IValidator
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
                    Description = ValidationIssueCodes.DataElementCodes.MissingContentType,
                }
            );
        }
        else
        {
            var contentTypeWithoutEncoding = dataElement.ContentType.Split(";")[0];

            if (
                dataType.AllowedContentTypes != null
                && dataType.AllowedContentTypes.Count > 0
                && dataType.AllowedContentTypes.TrueForAll(ct =>
                    !ct.Equals(contentTypeWithoutEncoding, StringComparison.OrdinalIgnoreCase)
                )
            )
            {
                issues.Add(
                    new ValidationIssue
                    {
                        DataElementId = dataElement.Id,
                        Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                        Severity = ValidationIssueSeverity.Error,
                        Description =
                            $"ContentType {contentTypeWithoutEncoding} not allowed for {string.Join(",", dataType.AllowedContentTypes)}",
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
            issues.Add(
                new ValidationIssue
                {
                    DataElementId = dataElement.Id,
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
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
                    Description = ValidationIssueCodes.DataElementCodes.DataElementFileInfected,
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
                    Description = ValidationIssueCodes.DataElementCodes.DataElementFileScanPending,
                    Field = dataType.Id,
                }
            );
        }

        return Task.FromResult(issues);
    }
}
