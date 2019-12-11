using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;

using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.Utils;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// This handles a asp.net core application running with JWT tokens in cookie.
    /// Code is inspired by ASP.Net Core CookieAuthentication
    /// </summary>
    public class JwtCookieHandler : SignInAuthenticationHandler<JwtCookieOptions>
    {
        private const string HeaderValueNoCache = "no-cache";
        private const string HeaderValueEpocDate = "Thu, 01 Jan 1970 00:00:00 GMT";

        private readonly KeyVaultSettings _keyVaultSettings;
        private readonly CertificateSettings _certificateSettings;

        /// <summary>
        /// The default constructor
        /// </summary>
        /// <param name="options">The options</param>
        /// <param name="logger">The logger</param>
        /// <param name="encoder">The Url encoder</param>
        /// <param name="clock">The system clock</param>
        /// <param name="keyVaultSettings">The key vault settings</param>
        /// <param name="certSettings">The certification settings</param>
        public JwtCookieHandler(
            IOptionsMonitor<JwtCookieOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock,
            IOptions<KeyVaultSettings> keyVaultSettings,
            IOptions<CertificateSettings> certSettings)
            : base(options, logger, encoder, clock)
        {
            _keyVaultSettings = keyVaultSettings.Value;
            _certificateSettings = certSettings.Value;
        }

        /// <summary>
        /// The handler calls methods on the events which give the application control at certain points where processing is occurring.
        /// If it is not provided a default instance is supplied which does nothing when the methods are called.
        /// </summary>
        protected new JwtCookieEvents Events
        {
            get => (JwtCookieEvents)base.Events;
            set => base.Events = value;
        }

        /// <summary>
        /// Creates a new instance of the events instance.
        /// </summary>
        /// <returns>A new instance of the events instance.</returns>
        protected override Task<object> CreateEventsAsync() => Task.FromResult<object>(new JwtCookieEvents());

        /// <summary>
        ///  Handles the authentication of the request
        /// </summary>
        /// <returns></returns>
        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            try
            {
                string token = string.Empty;

                // First get the token from authorization header
                string authorization = Request.Headers["Authorization"];

                // If no authorization header found, get the token
                if (!string.IsNullOrEmpty(authorization))
                {
                    if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        token = authorization.Substring("Bearer ".Length).Trim();
                    }
                }

                // If the token is not found in authorization header, get the token from cookie
                if (string.IsNullOrEmpty(token))
                {
                    // Get the cookie from request
                    token = Options.CookieManager.GetRequestCookie(Context, Options.Cookie.Name);
                }

                // If no token found, return no result
                if (string.IsNullOrEmpty(token))
                {
                    return AuthenticateResult.NoResult();
                }

                TokenValidationParameters validationParameters = Options.TokenValidationParameters.Clone();
                if (Options.ConfigurationManager != null)
                {
                    OpenIdConnectConfiguration configuration = await Options.ConfigurationManager.GetConfigurationAsync(Context.RequestAborted);

                    if (configuration != null)
                    {
                        var issuers = new[] { configuration.Issuer };
                        validationParameters.ValidIssuers = validationParameters.ValidIssuers?.Concat(issuers) ?? issuers;

                        validationParameters.IssuerSigningKeys = validationParameters.IssuerSigningKeys?.Concat(configuration.SigningKeys)
                                                                 ?? configuration.SigningKeys;
                    }
                }

                JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();
                if (!validator.CanReadToken(token))
                {
                    return AuthenticateResult.Fail("No SecurityTokenValidator available for token: " + token);
                }

                ClaimsPrincipal principal;
                SecurityToken validatedToken;
                try
                {
                    principal = validator.ValidateToken(token, validationParameters, out validatedToken);
                }
                catch (Exception ex)
                {
                    Logger.LogInformation("Failed to validate token.");

                    // Refresh the configuration for exceptions that may be caused by key rollovers. The user can also request a refresh in the event.
                    if (Options.RefreshOnIssuerKeyNotFound &&
                        Options.ConfigurationManager != null &&
                        ex is SecurityTokenSignatureKeyNotFoundException)
                    {
                        Options.ConfigurationManager.RequestRefresh();
                    }

                    JwtCookieFailedContext jwtCookieFailedContext = new JwtCookieFailedContext(Context, Scheme, Options)
                    {
                        Exception = ex
                    };

                    await Events.AuthenticationFailed(jwtCookieFailedContext);
                    if (jwtCookieFailedContext.Result != null)
                    {
                        return jwtCookieFailedContext.Result;
                    }

                    return AuthenticateResult.Fail(jwtCookieFailedContext.Exception);
                }

                Logger.LogInformation("Successfully validated the token.");
                JwtCookieValidatedContext jwtCookieValidatedContext = new JwtCookieValidatedContext(Context, Scheme, Options)
                {
                    Principal = principal,
                    SecurityToken = validatedToken
                };

                await Events.TokenValidated(jwtCookieValidatedContext);

                if (jwtCookieValidatedContext.Result != null)
                {
                    return jwtCookieValidatedContext.Result;
                }

                jwtCookieValidatedContext.Success();
                return jwtCookieValidatedContext.Result;

            }
            catch (Exception ex)
            {
                Logger.LogInformation("Exception occurred while processing message.");
                JwtCookieFailedContext jwtCookieFailedContext = new JwtCookieFailedContext(Context, Scheme, Options)
                {
                    Exception = ex
                };

                await Events.AuthenticationFailed(jwtCookieFailedContext);
                if (jwtCookieFailedContext.Result != null)
                {
                    return jwtCookieFailedContext.Result;
                }

                throw;
            }
        }

        /// <summary>
        /// Handles when a user is signing in
        /// </summary>
        /// <param name="user">The user</param>
        /// <param name="properties">The authentication properties</param>
        /// <returns></returns>
        protected override async Task HandleSignInAsync(ClaimsPrincipal user, AuthenticationProperties properties)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user));
            }

            properties ??= new AuthenticationProperties();

            CookieOptions cookieOptions = BuildCookieOptions();

            JwtCookieSigningInContext signInContext = new JwtCookieSigningInContext(
               Context,
               Scheme,
               Options,
               user,
               properties,
               cookieOptions);

            DateTimeOffset issuedUtc;
            if (signInContext.Properties.IssuedUtc.HasValue)
            {
                issuedUtc = signInContext.Properties.IssuedUtc.Value;
            }
            else
            {
                issuedUtc = Clock.UtcNow;
                signInContext.Properties.IssuedUtc = issuedUtc;
            }

            if (!signInContext.Properties.ExpiresUtc.HasValue)
            {
                signInContext.Properties.ExpiresUtc = issuedUtc.Add(Options.ExpireTimeSpan);
            }

            await Events.SigningIn(signInContext);

            if (signInContext.Properties.IsPersistent)
            {
                DateTimeOffset expiresUtc = signInContext.Properties.ExpiresUtc ?? issuedUtc.Add(Options.ExpireTimeSpan);
                signInContext.CookieOptions.Expires = expiresUtc.ToUniversalTime();
            }

            string jwtToken = await GenerateToken(user, Options.ExpireTimeSpan);

            Options.CookieManager.AppendResponseCookie(
            Context,
            Options.Cookie.Name,
            jwtToken,
            signInContext.CookieOptions);

            JwtCookieSignedInContext signedInContext = new JwtCookieSignedInContext(
                Context,
                Scheme,
                signInContext.Principal,
                signInContext.Properties,
                Options);

            await Events.SignedIn(signedInContext);

            // Only redirect on the login path
            bool shouldRedirect = Options.LoginPath.HasValue && OriginalPath == Options.LoginPath;
            await ApplyHeaders(shouldRedirect, signedInContext.Properties);
        }

        /// <summary>
        /// Handles signing out
        /// </summary>
        /// <param name="properties">The authentication properties</param>
        /// <returns></returns>
        protected override Task HandleSignOutAsync(AuthenticationProperties properties)
        {
            throw new NotImplementedException();
        }

        /// <summary>
        /// Generates a token
        /// </summary>
        /// <param name="principal">the claims principal</param>
        /// <param name="tokenExipry">validity time span for the token</param>
        /// <returns></returns>
        public async Task<string> GenerateToken(ClaimsPrincipal principal, TimeSpan tokenExipry)
        {
            // authentication successful so generate jwt token
            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(principal.Identity),
                Expires = DateTime.UtcNow.AddSeconds(tokenExipry.TotalSeconds),
                SigningCredentials = await GetSigningCredentials()
            };

            SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
            string tokenstring = tokenHandler.WriteToken(token);

            return tokenstring;
        }

        private async Task<SigningCredentials> GetSigningCredentials()
        {
            return await SigningCredentialsProvider.GetSigningCredentials(_keyVaultSettings, _certificateSettings);
        }

        private CookieOptions BuildCookieOptions()
        {
            CookieOptions cookieOptions = Options.Cookie.Build(Context);

            // ignore the 'Expires' value as this will be computed elsewhere
            cookieOptions.Expires = null;

            return cookieOptions;
        }

        private async Task ApplyHeaders(bool shouldRedirectToReturnUrl, AuthenticationProperties properties)
        {
            Response.Headers[HeaderNames.CacheControl] = HeaderValueNoCache;
            Response.Headers[HeaderNames.Pragma] = HeaderValueNoCache;
            Response.Headers[HeaderNames.Expires] = HeaderValueEpocDate;

            if (shouldRedirectToReturnUrl && Response.StatusCode == 200)
            {
                // set redirect uri in order:
                // 1. properties.RedirectUri
                // 2. query parameter ReturnUrlParameter
                //
                // Absolute uri is not allowed if it is from query string as query string is not
                // a trusted source.
                var redirectUri = properties.RedirectUri;
                if (string.IsNullOrEmpty(redirectUri))
                {
                    redirectUri = Request.Query[Options.ReturnUrlParameter];
                    if (string.IsNullOrEmpty(redirectUri) || !IsHostRelative(redirectUri))
                    {
                        redirectUri = null;
                    }
                }

                if (redirectUri != null)
                {
                    await Events.RedirectToReturnUrl(
                        new RedirectContext<JwtCookieOptions>(Context, Scheme, Options, properties, redirectUri));
                }
            }
        }

        private static bool IsHostRelative(string path)
        {
            // Todo handles login to apps that will not be relative
            if (string.IsNullOrEmpty(path))
            {
                return false;
            }

            if (path.Length == 1)
            {
                return path[0] == '/';
            }

            return path[0] == '/' && path[1] != '/' && path[1] != '\\';
        }
    }
}
