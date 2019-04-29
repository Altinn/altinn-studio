using System;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// Extensions for enabling JwtCookie authentication in a Asp.Net Core application
    /// </summary>
    public static class JwtCookieExtensions
    {
        /// <summary>
        /// Enable the JwtCookie Authentication in a ASP.Net Core application
        /// </summary>
        /// <param name="builder">The authentication builder</param>
        /// <returns></returns>
        public static AuthenticationBuilder AddJwtCookie(this AuthenticationBuilder builder)
          => builder.AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, _ => { });

        /// <summary>
        /// Enable the JwtCookie Authentication in a ASP.Net Core application
        /// </summary>
        /// <param name="builder">The authentication builder</param>
        /// <param name="configureOptions">The configure options</param>
        /// <returns></returns>
        public static AuthenticationBuilder AddJwtCookie(this AuthenticationBuilder builder, Action<JwtCookieOptions> configureOptions)
            => builder.AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, configureOptions);

        /// <summary>
        /// Enable the JwtCookie Authentication in a ASP.Net Core application
        /// </summary>
        /// <param name="builder">The authentication builder</param>
        /// <param name="authenticationScheme">Name of the authentication scheme</param>
        /// <param name="configureOptions">The configure options</param>
        /// <returns></returns>
        public static AuthenticationBuilder AddJwtCookie(this AuthenticationBuilder builder, string authenticationScheme, Action<JwtCookieOptions> configureOptions)
            => builder.AddJwtCookie(authenticationScheme, displayName: null, configureOptions: configureOptions);

        /// <summary>
        /// Enable the JwtCookie Authentication in a ASP.Net Core application
        /// </summary>
        /// <param name="builder">The authentication builder</param>
        /// <param name="authenticationScheme">Name of the authentication scheme</param>
        /// <param name="displayName">The display name</param>
        /// <param name="configureOptions">The configure options</param>
        /// <returns></returns>
        public static AuthenticationBuilder AddJwtCookie(this AuthenticationBuilder builder, string authenticationScheme, string displayName, Action<JwtCookieOptions> configureOptions)
        {
            builder.Services.TryAddEnumerable(ServiceDescriptor.Singleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptions>());
            return builder.AddScheme<JwtCookieOptions, JwtCookieHandler>(authenticationScheme, displayName, configureOptions);
        }
    }
}
