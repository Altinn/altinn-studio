using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// Post configures the Jwt Cookie options
    /// </summary>
    public class JwtCookiePostConfigureOptions: IPostConfigureOptions<JwtCookieOptions>
    {
        /// <summary>
        /// Invoked to post configure a TOptions instance.
        /// </summary>
        /// <param name="name">The name of the options instance being configured.</param>
        /// <param name="options">The options instance to configure.</param>
        public void PostConfigure(string name, JwtCookieOptions options)
        {
            if (string.IsNullOrEmpty(options.Cookie.Name))
            {
                options.Cookie.Name = JwtCookieDefaults.CookiePrefix + name;
            }

            if (options.CookieManager == null)
            {
                options.CookieManager = new ChunkingCookieManager();
            }

            if (!options.LoginPath.HasValue)
            {
                options.LoginPath = JwtCookieDefaults.LoginPath;
            }

            if (!options.LogoutPath.HasValue)
            {
                options.LogoutPath = JwtCookieDefaults.LogoutPath;
            }

            if (!options.AccessDeniedPath.HasValue)
            {
                options.AccessDeniedPath = JwtCookieDefaults.AccessDeniedPath;
            }
        }
    }
}
