using System;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

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

            if (!string.IsNullOrEmpty(options.MetadataAddress))
            {
                if (!options.MetadataAddress.EndsWith("/", StringComparison.Ordinal))
                {
                    options.MetadataAddress += "/";
                }

                options.MetadataAddress += ".well-known/openid-configuration";
                options.ConfigurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                    options.MetadataAddress,
                    new OpenIdConnectConfigurationRetriever(),
                    new HttpDocumentRetriever { RequireHttps = options.RequireHttpsMetadata });
            }
        }
    }
}
