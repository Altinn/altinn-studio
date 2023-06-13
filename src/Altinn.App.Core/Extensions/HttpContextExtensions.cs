using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using System.Net.Http.Headers;

namespace Altinn.App.Core.Extensions
{
    /// <summary>
    /// Extension methods for <see cref="HttpContext"/>
    /// </summary>
    public static class HttpContextExtensions
    {
        /// <summary>
        /// Reads the request body and returns it as a <see cref="StreamContent"/>
        /// </summary>
        public static StreamContent CreateContentStream(this HttpRequest request)
        {
            StreamContent content = new StreamContent(request.Body);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse(request.ContentType);

            if (request.Headers.TryGetValue("Content-Disposition", out StringValues headerValues))
            {
                content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse(headerValues.ToString());
            }

            return content;
        }
    }
}
