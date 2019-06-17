using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
        public JwtCookieHandler(IOptionsMonitor<JwtCookieOptions> options, ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock, IOptions<KeyVaultSettings> keyVaultSettings, IOptions<CertificateSettings> certSettings) : base(options, logger, encoder, clock)
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
                // Get the cookie from request 
                string token = Options.CookieManager.GetRequestCookie(Context, Options.Cookie.Name);

                Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Token {Options.Cookie.Name} has value: {token}");

                // If no cookie present 
                if (string.IsNullOrEmpty(token))
                {
                    string authorization = Request.Headers["Authorization"];

                    // If no authorization header found, nothing to process further
                    if (string.IsNullOrEmpty(authorization))
                    {
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] No authorization header was retrieved.");
                        return AuthenticateResult.NoResult();
                    }

                    if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Retrieving token from request header.");
                        token = authorization.Substring("Bearer ".Length).Trim();
                    }

                    // If no token found, no further work possible
                    if (string.IsNullOrEmpty(token))
                    {
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Authorization header, but no bearer token.");
                        return AuthenticateResult.NoResult();
                    }
                }

                TokenValidationParameters validationParameters = Options.TokenValidationParameters.Clone();

                JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();

                SecurityToken validatedToken;
                ClaimsPrincipal principal;
                if (validator.CanReadToken(token))
                {
                    try
                    {
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Validating token.");

                        principal = validator.ValidateToken(token, validationParameters, out validatedToken);

                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Token validated.");
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Validated token: {validatedToken}.");
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] validationParameters: {validationParameters}.");

                        JwtCookieValidatedContext jwtCookieValidatedContext = new JwtCookieValidatedContext(Context, Scheme, Options)
                        {
                            Principal = principal,
                            SecurityToken = validatedToken
                        };

                        await Events.TokenValidated(jwtCookieValidatedContext);

                        if (jwtCookieValidatedContext.Result != null)
                        {
                            Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] jwtCookieValidatedContext.Result != null.");
                            Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Return value {jwtCookieValidatedContext.Result}.");

                            return jwtCookieValidatedContext.Result;
                        }

                        jwtCookieValidatedContext.Success();
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] After jwtCookieValidatedContext.Success();");
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Return value {jwtCookieValidatedContext.Result}.");
                        return jwtCookieValidatedContext.Result;
                    }
                    catch (Exception ex)
                    {
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Exception thrown during validation:  {ex.Message}");

                        JwtCookieFailedContext jwtCookieFailedContext = new JwtCookieFailedContext(Context, Scheme, Options)
                        {
                            Exception = ex
                        };

                        await Events.AuthenticationFailed(jwtCookieFailedContext);

                        if (jwtCookieFailedContext.Result != null)
                        {
                            Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] (jwtCookieFailedContext.Result != null");
                            Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Return value {jwtCookieFailedContext.Result}.");

                            return jwtCookieFailedContext.Result;
                        }

                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Final return");
                        Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Return exception {jwtCookieFailedContext.Exception}.");

                        return AuthenticateResult.Fail(jwtCookieFailedContext.Exception);

                        // Logger.TokenValidationFailed(ex);

                        // Todo: Handle refresh of certificat from the token source
                    }
                }

                Logger.LogInformation($"/// Authorization test /// [JwtCookieHandler.cs] [HandleAuthenticateAsync] Could not read token. No SecurityTokenValidator available. ");

                return AuthenticateResult.Fail("No SecurityTokenValidator available for token: " + token ?? "[null]");
            }
            catch (Exception ex)
            {
                JwtCookieFailedContext jwtCookieFailedContext = new JwtCookieFailedContext(Context, Scheme, Options)
                {
                    Exception = ex
                };

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
        protected async override Task HandleSignInAsync(ClaimsPrincipal user, AuthenticationProperties properties)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user));
            }

            properties = properties ?? new AuthenticationProperties();

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
                var expiresUtc = signInContext.Properties.ExpiresUtc ?? issuedUtc.Add(Options.ExpireTimeSpan);
                signInContext.CookieOptions.Expires = expiresUtc.ToUniversalTime();
            }

            string jwtToken = GetToken(user, Options.ExpireTimeSpan);

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

        private string GetToken(ClaimsPrincipal principal, TimeSpan tokenExipry)
        {
            // authentication successful so generate jwt token
            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(principal.Identity),
                Expires = DateTime.UtcNow.AddSeconds(tokenExipry.TotalSeconds),
                SigningCredentials = GetSigningCredentials()
            };

            SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
            string tokenstring = tokenHandler.WriteToken(token);

            return tokenstring;
        }

        private SigningCredentials GetSigningCredentials()
        {
            if (string.IsNullOrEmpty(_keyVaultSettings.ClientId) || string.IsNullOrEmpty(_keyVaultSettings.ClientSecret))
            {
                X509Certificate2 cert = new X509Certificate2(_certificateSettings.CertificatePath, _certificateSettings.CertificatePwd);
                SigningCredentials creds = new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);
                return creds;
            }
            else
            {
                KeyVaultClient client = KeyVaultSettings.GetClient(_keyVaultSettings.ClientId, _keyVaultSettings.ClientSecret);
                CertificateBundle certificate = client.GetCertificateAsync(_keyVaultSettings.SecretUri, _certificateSettings.CertificateName).GetAwaiter().GetResult();
                SecretBundle secret = client.GetSecretAsync(certificate.SecretIdentifier.Identifier).GetAwaiter().GetResult();
                byte[] pfxBytes = Convert.FromBase64String(secret.Value);
                X509Certificate2 cert = new X509Certificate2(pfxBytes);
                SigningCredentials creds = new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);
                return creds;
            }
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
