using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// This handles a asp.net core application running with JWT tokens in cookie.
    /// Code is inspired by ASP.Net Core CookieAuthentication
    /// </summary>
    public class JwtCookieHandler : AuthenticationHandler<JwtCookieOptions>
    {
        /// <summary>
        /// The default constructor
        /// </summary>
        /// <param name="options">The options</param>
        /// <param name="logger">The logger</param>
        /// <param name="encoder">The Url encoder</param>
        /// <param name="clock">The system clock</param>
        public JwtCookieHandler(
            IOptionsMonitor<JwtCookieOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock)
            : base(options, logger, encoder, clock)
        {
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
                    // Try to get the cookie from the default cookie value
                    token = Options.CookieManager.GetRequestCookie(Context, JwtCookieDefaults.AltinnTokenCookie);

                    if (string.IsNullOrEmpty(token))
                    {
                        // Get the cookie from the configured cookie value
                        token = Options.CookieManager.GetRequestCookie(Context, Options.JwtCookieName);
                    }
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

                        validationParameters.IssuerSigningKeys =
                            validationParameters.IssuerSigningKeys?.Concat(configuration.SigningKeys) ?? configuration.SigningKeys;
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
    }
}
