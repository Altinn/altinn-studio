using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Headers;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Api.Helpers.RequestHandling;

/// <summary>
/// Check datarestrictions on http requests
/// </summary>
public static class DataRestrictionValidation
{
    /// <summary>
    /// Check if a data post/put request complies with restrictions agreed upon for the DataController
    /// </summary>
    /// <param name="request">the original http request</param>
    /// <param name="dataType">datatype the files is beeing uploaded to</param>
    /// <returns>true with errorResponse = empty list if all is ok, false with errorResponse including errors if not</returns>
    public static (bool Success, List<ValidationIssue> Errors) CompliesWithDataRestrictions(
        HttpRequest request,
        DataType? dataType
    )
    {
        List<ValidationIssue> errors = new();
        var errorBaseMessage = "Invalid data provided. Error:";
        if (!request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
        {
            errors.Add(
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                    Severity = ValidationIssueSeverity.Error,
                    Description = $"{errorBaseMessage} The request must include a Content-Disposition header",
                }
            );

            return (false, errors);
        }

        var maxSize = (long?)dataType?.MaxSize * 1024 * 1024;
        if (maxSize != null && request.ContentLength > maxSize)
        {
            errors.Add(
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Severity = ValidationIssueSeverity.Error,
                    Description = $"{errorBaseMessage} Binary attachment exceeds limit of {maxSize}",
                }
            );

            return (false, errors);
        }

        if (!TryGetFileNameFromHeader(headerValues, out string? filename))
        {
            errors.Add(
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.MissingFileName,
                    Severity = ValidationIssueSeverity.Error,
                    Description = $"{errorBaseMessage} The Content-Disposition header must contain a valid filename",
                }
            );

            return (false, errors);
        }

        string[] splitFilename = filename.Split('.');

        if (splitFilename.Length < 2)
        {
            errors.Add(
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat,
                    Severity = ValidationIssueSeverity.Error,
                    Description =
                        $"{errorBaseMessage} Invalid format for filename: {filename}. Filename is expected to end with '.{{filetype}}'.",
                }
            );

            return (false, errors);
        }

        if (dataType?.AllowedContentTypes == null || dataType.AllowedContentTypes.Count == 0)
        {
            return (true, errors);
        }

        string filetype = Path.GetExtension(filename);
        var mimeType = MimeTypeMap.GetMimeType(filetype);

        if (!request.Headers.TryGetValue("Content-Type", out StringValues contentType))
        {
            errors.Add(
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat,
                    Severity = ValidationIssueSeverity.Error,
                    Description = $"{errorBaseMessage} Content-Type header must be included in request.",
                }
            );

            return (false, errors);
        }

        // Verify that file mime type matches content type in request
        if (!contentType.Equals("application/octet-stream") && !mimeType.Equals(contentType))
        {
            errors.Add(
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat,
                    Severity = ValidationIssueSeverity.Error,
                    Description =
                        $"{errorBaseMessage} Content type header {contentType} does not match mime type {mimeType} for uploaded file. Please fix header or upload another file.",
                }
            );

            return (false, errors);
        }

        // Verify that file mime type is an allowed content-type
        if (
            !dataType.AllowedContentTypes.Contains(contentType.ToString(), StringComparer.InvariantCultureIgnoreCase)
            && !dataType.AllowedContentTypes.Contains("application/octet-stream")
        )
        {
            errors.Add(
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                    Severity = ValidationIssueSeverity.Error,
                    Description =
                        $"{errorBaseMessage} Invalid content type: {mimeType}. Please try another file. Permitted content types include: {string.Join(", ", dataType.AllowedContentTypes)}",
                }
            );

            return (false, errors);
        }

        return (true, errors);
    }

    /// <summary>
    /// Uses the provided header to extract the filename
    /// </summary>
    public static string? GetFileNameFromHeader(StringValues headerValues)
    {
        string? headerValue = headerValues;
        ArgumentNullException.ThrowIfNull(headerValue, nameof(headerValues));

        ContentDispositionHeaderValue contentDisposition = ContentDispositionHeaderValue.Parse(headerValue);
        string? filename = contentDisposition.FileNameStar ?? contentDisposition.FileName;

        // We actively remove quotes because we don't want them replaced with '_'.
        // Quotes around filename in Content-Disposition is valid, but not as part of the filename.
        filename = filename?.Trim('\"').AsFileName(false);

        return filename;
    }

    /// <summary>
    /// Tries to extract the filename from the provided header using safe parsing
    /// </summary>
    /// <param name="headerValues">The Content-Disposition header values</param>
    /// <param name="filename">The extracted filename if successful</param>
    /// <returns>True if filename was successfully extracted, false otherwise</returns>
    public static bool TryGetFileNameFromHeader(StringValues headerValues, [NotNullWhen(true)] out string? filename)
    {
        filename = null;
        string? headerValue = headerValues;

        if (string.IsNullOrEmpty(headerValue))
        {
            return false;
        }

        if (!ContentDispositionHeaderValue.TryParse(headerValue, out ContentDispositionHeaderValue? contentDisposition))
        {
            return false;
        }

        filename = contentDisposition.FileNameStar ?? contentDisposition.FileName;

        // We actively remove quotes because we don't want them replaced with '_'.
        // Quotes around filename in Content-Disposition is valid, but not as part of the filename.
        filename = filename?.Trim('\"').AsFileName(false);

        return !string.IsNullOrEmpty(filename);
    }
}
