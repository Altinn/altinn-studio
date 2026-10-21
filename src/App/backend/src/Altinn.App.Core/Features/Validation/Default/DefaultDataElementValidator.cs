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
                BuiltInValidationIssues.MissingContentType(
                    dataElementId: dataElement.Id,
                    filename: dataElement.Filename,
                    dataType: dataType.Id
                )
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
                issues.Add(
                    BuiltInValidationIssues.ContentTypeNotAllowed(
                        dataElementId: dataElement.Id,
                        filename: dataElement.Filename,
                        dataType: dataType.Id,
                        contentType: contentTypeWithoutEncoding,
                        allowedContentTypes: dataType.AllowedContentTypes
                    )
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
                BuiltInValidationIssues.FileTooLarge(
                    dataElementId: dataElement.Id,
                    filename: dataElement.Filename,
                    dataType: dataType.Id,
                    maxSize: dataType.MaxSize.Value
                )
            );
        }

        if (dataType.EnableFileScan && dataElement.FileScanResult == FileScanResult.Infected)
        {
            issues.Add(
                BuiltInValidationIssues.FileInfected(
                    dataElementId: dataElement.Id,
                    filename: dataElement.Filename,
                    dataType: dataType.Id
                )
            );
        }

        if (
            dataType.EnableFileScan
            && dataType.ValidationErrorOnPendingFileScan
            && dataElement.FileScanResult == FileScanResult.Pending
        )
        {
            issues.Add(
                BuiltInValidationIssues.FileScanPending(
                    dataElementId: dataElement.Id,
                    filename: dataElement.Filename,
                    dataType: dataType.Id
                )
            );
        }

        return Task.FromResult(issues);
    }
}
