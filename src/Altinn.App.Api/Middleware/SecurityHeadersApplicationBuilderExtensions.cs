using Microsoft.AspNetCore.Builder;

namespace Altinn.App.Api.Middleware
{
    /// <summary>
    /// Extensions for adding default security headers middleware to the pipeline.
    /// </summary>
    public static class SecurityHeadersApplicationBuilderExtensions
    {
        /// <summary>
        /// Adds the security headers to the pipeline.
        /// </summary>
        /// <param name="builder">The application builder</param>
        /// <returns></returns>
        public static IApplicationBuilder UseDefaultSecurityHeaders(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<SecurityHeadersMiddleware>();
        }
    }
}
