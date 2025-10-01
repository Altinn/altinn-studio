using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Net.Http.Headers;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Helper for checking a multipart request
    /// </summary>
    public static class MultipartRequestHelper
    {
        /// <summary>
        /// Content-Type: multipart/form-data; boundary="----WebKitFormBoundarymx2fSWqWSd0OxQqq"
        /// The spec says 70 characters is a reasonable limit.
        /// </summary>
        /// <param name="contentType">The request content type</param>
        /// <param name="lengthLimit">The set length limit</param>
        /// <returns></returns>
        public static string GetBoundary(MediaTypeHeaderValue contentType, int lengthLimit)
        {
            string boundary = HeaderUtilities.RemoveQuotes(contentType.Boundary).Value;
            if (string.IsNullOrWhiteSpace(boundary))
            {
                throw new InvalidDataException("Missing content-type boundary.");
            }

            if (boundary.Length > lengthLimit)
            {
                throw new InvalidDataException(
                    $"Multipart boundary length limit {lengthLimit} exceeded.");
            }

            return boundary;
        }

        /// <summary>
        /// Check if request has content type multipart
        /// </summary>
        /// <param name="contentType">The content type to check</param>
        /// <returns>A value indicating whether the supplied content type is multipart</returns>
        public static bool IsMultipartContentType(string contentType)
        {
            return !string.IsNullOrEmpty(contentType)
                    && contentType.Contains("multipart/", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Check if content disposition is form data
        /// </summary>
        /// <param name="contentDisposition">The content disposition to check</param>
        /// <returns>A value indication whether the supplied content disposition is form data</returns>
        public static bool HasFormDataContentDisposition(ContentDispositionHeaderValue contentDisposition)
        {
            // Content-Disposition: form-data; name="key";
            return contentDisposition != null
                    && contentDisposition.DispositionType.Equals("form-data")
                    && string.IsNullOrEmpty(contentDisposition.FileName.Value)
                    && string.IsNullOrEmpty(contentDisposition.FileNameStar.Value);
        }

        /// <summary>
        /// Check content disposition is file
        /// </summary>
        /// <param name="contentDisposition">The content disposition to check</param>
        /// <returns>A value indicating if the supplied content disposition is file</returns>
        public static bool HasFileContentDisposition(ContentDispositionHeaderValue contentDisposition)
        {
            // Content-Disposition: form-data; name="myfile1"; filename="Misc 002.jpg"
            return contentDisposition != null
                    && contentDisposition.DispositionType.Equals("form-data")
                    && (!string.IsNullOrEmpty(contentDisposition.FileName.Value)
                        || !string.IsNullOrEmpty(contentDisposition.FileNameStar.Value));
        }
    }   
}
