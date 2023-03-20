#nullable enable
using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Api.Helpers.RequestHandling
{
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
        /// <param name="errorResponse">Null if validation passed, error response if not</param>
        /// <returns>true with errorResponse = null if all is ok, false with errorResponse if not</returns>
        public static bool CompliesWithDataRestrictions(HttpRequest request, DataType? dataType, out ActionResult? errorResponse)
        {
            var errorBaseMessage = "Invalid data provided. Error:";
            errorResponse = null;
            if (!request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
            {
                errorResponse = new BadRequestObjectResult($"{errorBaseMessage} The request must include a Content-Disposition header");
                return false;
            }

            var maxSize = (long?)dataType?.MaxSize * 1024 * 1024;
            if (maxSize != null && request.ContentLength > maxSize)
            {
                errorResponse = new ObjectResult($"{errorBaseMessage} Binary attachment exceeds limit of {maxSize}")
                {
                    StatusCode = (int)HttpStatusCode.RequestEntityTooLarge
                };
                return false;
            }

            ContentDispositionHeaderValue contentDisposition = ContentDispositionHeaderValue.Parse(headerValues);
            string? filename = contentDisposition.FileNameStar ?? contentDisposition.FileName;

            if (string.IsNullOrEmpty(filename))
            {
                errorResponse = new BadRequestObjectResult($"{errorBaseMessage} The Content-Disposition header must contain a filename");
                return false;
            }

            // We actively remove quotes because we don't want them replaced with '_'.
            // Quotes around filename in Content-Disposition is valid, but not as part of the filename.
            filename = filename.Trim('\"').AsFileName(false);
            string[] splitFilename = filename.Split('.');

            if (splitFilename.Length < 2)
            {
                errorResponse = new BadRequestObjectResult($"{errorBaseMessage} Invalid format for filename: {filename}. Filename is expected to end with '.{{filetype}}'.");
                return false;
            }

            if (dataType?.AllowedContentTypes == null || dataType.AllowedContentTypes.Count == 0)
            {
                return true;
            }

            string filetype = splitFilename[splitFilename.Length - 1];
            string mimeType = MimeTypeMap.GetMimeType(filetype);

            if (!request.Headers.TryGetValue("Content-Type", out StringValues contentType))
            {
                errorResponse = new BadRequestObjectResult($"{errorBaseMessage} Content-Type header must be included in request.");
                return false;
            }

            // Verify that file mime type matches content type in request
            if (!contentType.Equals("application/octet-stream") && !mimeType.Equals(contentType, StringComparison.InvariantCultureIgnoreCase))
            {
                errorResponse = new BadRequestObjectResult($"{errorBaseMessage} Content type header {contentType} does not match mime type {mimeType} for uploaded file. Please fix header or upload another file.");
                return false;
            }

            // Verify that file mime type is an allowed content-type
            if (!dataType.AllowedContentTypes.Contains(mimeType, StringComparer.InvariantCultureIgnoreCase) && !dataType.AllowedContentTypes.Contains("application/octet-stream"))
            {
                errorResponse = new BadRequestObjectResult($"{errorBaseMessage} Invalid content type: {mimeType}. Please try another file. Permitted content types include: {string.Join(", ", dataType.AllowedContentTypes)}");
                return false;
            }

            return true;
        }
    }
}
