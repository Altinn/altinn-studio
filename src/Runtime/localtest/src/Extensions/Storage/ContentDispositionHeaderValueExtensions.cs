using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace Altinn.Platform.Storage.Extensions
{
    /// <summary>
    /// Extensions to simplify the use of <see cref="ContentDispositionHeaderValue"/>.
    /// </summary>
    public static class ContentDispositionHeaderValueExtensions
    {
        /// <summary>
        /// Obtain the filename value from FileNameStar or FileName if the FileNameStar property is empty.
        /// Then remove any quotes and clean the filename with the AsFileName method.
        /// </summary>
        /// <param name="contentDisposition">The ContentDispositionHeaderValue object to get a filename from.</param>
        /// <returns>A filename cleaned of any impurities.</returns>
        public static string GetFilename(this ContentDispositionHeaderValue contentDisposition)
        {
            StringSegment filename = contentDisposition.FileNameStar.HasValue
                ? contentDisposition.FileNameStar
                : contentDisposition.FileName;

            return HeaderUtilities.RemoveQuotes(filename).Value.AsFileName(false);
        }
    }
}
