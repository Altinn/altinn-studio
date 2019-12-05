using System;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// Options for Jwt Cookie authentications
    /// </summary>
    public class JwtCookieOptions : AuthenticationSchemeOptions
    {
        private CookieBuilder _cookieBuilder = new RequestPathBaseCookieBuilder
        {
            // the default name is configured in PostConfigureCookieAuthenticationOptions

            // To support OAuth authentication, a lax mode is required, see https://github.com/aspnet/Security/issues/1231.
            SameSite = SameSiteMode.Lax,
            HttpOnly = true,
            SecurePolicy = CookieSecurePolicy.SameAsRequest,
            IsEssential = true,
        };

        /// <summary>
        /// <para>
        /// Determines the settings used to create the cookie.
        /// </para>
        /// <para>
        /// <seealso cref="CookieBuilder.SameSite"/> defaults to <see cref="SameSiteMode.Lax"/>.
        /// <seealso cref="CookieBuilder.HttpOnly"/> defaults to <c>true</c>.
        /// <seealso cref="CookieBuilder.SecurePolicy"/> defaults to <see cref="CookieSecurePolicy.SameAsRequest"/>.
        /// </para>
        /// </summary>
        /// <remarks>
        /// <para>
        /// The default value for cookie name is ".AspNetCore.Cookies".
        /// This value should be changed if you change the name of the AuthenticationScheme, especially if your
        /// system uses the cookie authentication handler multiple times.
        /// </para>
        /// <para>
        /// <seealso cref="CookieBuilder.SameSite"/> determines if the browser should allow the cookie to be attached to same-site or cross-site requests.
        /// The default is Lax, which means the cookie is only allowed to be attached to cross-site requests using safe HTTP methods and same-site requests.
        /// </para>
        /// <para>
        /// <seealso cref="CookieBuilder.HttpOnly"/> determines if the browser should allow the cookie to be accessed by client-side javascript.
        /// The default is true, which means the cookie will only be passed to http requests and is not made available to script on the page.
        /// </para>
        /// <para>
        /// <seealso cref="CookieBuilder.Expiration"/> is currently ignored. Use <see cref="ExpireTimeSpan"/> to control lifetime of cookie authentication.
        /// </para>
        /// </remarks>
        public CookieBuilder Cookie
        {
            get => _cookieBuilder;
            set => _cookieBuilder = value ?? throw new ArgumentNullException(nameof(value));
        }

        /// <summary>
        /// The component used to get cookies from the request or set them on the response.
        ///
        /// ChunkingCookieManager will be used by default.
        /// </summary>
        public ICookieManager CookieManager { get; set; }

        /// <summary>
        /// Gets or sets the parameters used to validate identity tokens.
        /// </summary>
        /// <remarks>Contains the types and definitions required for validating a token.</remarks>
        /// <exception cref="ArgumentNullException">if 'value' is null.</exception>
        public TokenValidationParameters TokenValidationParameters { get; set; } = new TokenValidationParameters();

        /// <summary>
        /// Gets or sets the discovery endpoint for obtaining metadata
        /// </summary>
        public string MetadataAddress { get; set; }

        /// <summary>
        /// Gets or sets if a metadata refresh should be attempted after a SecurityTokenSignatureKeyNotFoundException. This allows for automatic
        /// recovery in the event of a signature key rollover. This is enabled by default.
        /// </summary>
        public bool RefreshOnIssuerKeyNotFound { get; set; } = true;

        /// <summary>
        /// The LoginPath property is used by the handler for the redirection target when handling ChallengeAsync.
        /// The current url which is added to the LoginPath as a query string parameter named by the ReturnUrlParameter. 
        /// Once a request to the LoginPath grants a new SignIn identity, the ReturnUrlParameter value is used to redirect 
        /// the browser back to the original url.
        /// </summary>
        public PathString LoginPath { get; set; }

        /// <summary>
        /// If the LogoutPath is provided the handler then a request to that path will redirect based on the ReturnUrlParameter.
        /// </summary>
        public PathString LogoutPath { get; set; }

        /// <summary>
        /// The AccessDeniedPath property is used by the handler for the redirection target when handling ForbidAsync.
        /// </summary>
        public PathString AccessDeniedPath { get; set; }

        /// <summary>
        /// <para>
        /// Controls how much time the authentication Jwt token stored in the cookie will remain valid from the point it is created
        /// The expiration information is stored in the protected cookie ticket. Because of that an expired cookie will be ignored
        /// even if it is passed to the server after the browser should have purged it.
        /// </para>
        /// <para>
        /// This is separate from the value of <seealso cref="CookieOptions.Expires"/>, which specifies
        /// how long the browser will keep the cookie.
        /// </para>
        /// </summary>
        public TimeSpan ExpireTimeSpan { get; set; }

        /// <summary>
        /// The ReturnUrlParameter determines the name of the query string parameter which is appended by the handler
        /// when during a Challenge. This is also the query string parameter looked for when a request arrives on the 
        /// login path or logout path, in order to return to the original url after the action is performed.
        /// </summary>
        public string ReturnUrlParameter { get; set; }

        /// <summary>
        /// Responsible for retrieving, caching, and refreshing the configuration from metadata.
        /// If not provided, then one will be created using the MetadataAddress and Backchannel properties.
        /// </summary>
        public IConfigurationManager<OpenIdConnectConfiguration> ConfigurationManager { get; set; }

        /// <summary>
        /// Defines if it is required to have a https metadata adress
        /// </summary>
        public bool RequireHttpsMetadata { get; set; } = true;
    }
}
