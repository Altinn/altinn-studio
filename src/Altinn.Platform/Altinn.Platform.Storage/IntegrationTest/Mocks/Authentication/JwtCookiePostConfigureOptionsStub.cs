using System;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Altinn.Platform.Storage.IntegrationTest.Mocks.Authentication
{
    /// <summary>
    /// Represents a stub for the <see cref="JwtCookiePostConfigureOptions"/> class to be used in integration tests.
    /// </summary>
    public class JwtCookiePostConfigureOptionsStub : IPostConfigureOptions<JwtCookieOptions>
    {
        /// <inheritdoc />
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

            if (!string.IsNullOrEmpty(options.MetadataAddress))
            {
                if (!options.MetadataAddress.EndsWith("/", StringComparison.Ordinal))
                {
                    options.MetadataAddress += "/";
                }
            }

            options.MetadataAddress += ".well-known/openid-configuration";
            options.ConfigurationManager = new ConfigurationManagerStub(
                options.MetadataAddress,
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever());
        }
    }
}
