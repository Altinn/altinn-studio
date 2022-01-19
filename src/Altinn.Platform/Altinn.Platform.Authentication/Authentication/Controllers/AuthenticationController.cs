using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;

using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Enum;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services;
using Altinn.Platform.Authentication.Services.Interfaces;
using Altinn.Platform.Profile.Models;

using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;

using Newtonsoft.Json.Linq;

using SameSiteMode = Microsoft.AspNetCore.Http.SameSiteMode;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Handles the authentication of requests to platform
    /// </summary>
    [Route("authentication/api/v1")]
    [ApiController]
    public class AuthenticationController : ControllerBase
    {
        private const string HeaderValueNoCache = "no-cache";
        private const string HeaderValueEpocDate = "Thu, 01 Jan 1970 00:00:00 GMT";
        private const string OrganisationIdentity = "OrganisationLogin";
        private const string EndUserSystemIdentity = "EndUserSystemLogin";
        private const string AltinnStudioIdentity = "AltinnStudioDesignerLogin";
        private const string PidClaimName = "pid";
        private const string AuthLevelClaimName = "acr";
        private const string AuthMethodClaimName = "amr";
        private const string IssClaimName = "iss";
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;
        private readonly IOrganisationsService _organisationService;
        private readonly IJwtSigningCertificateProvider _certificateProvider;
        private readonly ISblCookieDecryptionService _cookieDecryptionService;
        private readonly ISigningKeysRetriever _signingKeysRetriever;
        private readonly IUserProfileService _userProfileService;
        private readonly IEnterpriseUserAuthenticationService _enterpriseUserAuthenticationService;
        private readonly JwtSecurityTokenHandler _validator;
        private readonly ISigningKeysResolver _designerSigningKeysResolver;
        private readonly IOidcProvider _oidcProvider;

        private readonly OidcProviderSettings _oidcProviderSettings;
        private readonly IAntiforgery _antiforgery;

        /// <summary>
        /// Initialises a new instance of the <see cref="AuthenticationController"/> class with the given dependencies.
        /// </summary>
        /// <param name="logger">A generic logger</param>
        /// <param name="generalSettings">Configuration for the authentication scope.</param>
        /// <param name="oidcProviderSettings">Configuration for the oidcProviders</param>
        /// <param name="cookieDecryptionService">A service that can decrypt a .ASPXAUTH cookie.</param>
        /// <param name="organisationRepository">the repository object that holds valid organisations</param>
        /// <param name="certificateProvider">Service that can obtain a list of certificates that can be used to generate JSON Web Tokens.</param>
        /// <param name="userProfileService">Service that can retrieve user profiles.</param>
        /// <param name="enterpriseUserAuthenticationService">Service that can retrieve enterprise user profile.</param>
        /// <param name="signingKeysRetriever">The class to use to obtain the signing keys.</param>
        /// <param name="signingKeysResolver">Signing keys resolver for Altinn Common AccessToken</param>
        /// <param name="oidcProvider">The OIDC provider</param>
        /// <param name="antiforgery">The anti forgery service.</param>
        public AuthenticationController(
            ILogger<AuthenticationController> logger,
            IOptions<GeneralSettings> generalSettings,
            IOptions<OidcProviderSettings> oidcProviderSettings,
            ISigningKeysRetriever signingKeysRetriever,
            IJwtSigningCertificateProvider certificateProvider,
            ISblCookieDecryptionService cookieDecryptionService,
            IUserProfileService userProfileService,
            IEnterpriseUserAuthenticationService enterpriseUserAuthenticationService,
            IOrganisationsService organisationRepository,
            ISigningKeysResolver signingKeysResolver,
            IOidcProvider oidcProvider,
            IAntiforgery antiforgery)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            _oidcProviderSettings = oidcProviderSettings.Value;
            _signingKeysRetriever = signingKeysRetriever;
            _certificateProvider = certificateProvider;
            _cookieDecryptionService = cookieDecryptionService;
            _organisationService = organisationRepository;
            _userProfileService = userProfileService;
            _enterpriseUserAuthenticationService = enterpriseUserAuthenticationService;
            _designerSigningKeysResolver = signingKeysResolver;
            _validator = new JwtSecurityTokenHandler();
            _oidcProvider = oidcProvider;
            _antiforgery = antiforgery;
        }

        /// <summary>
        /// Request that handles the form authentication cookie from SBL
        /// </summary>
        /// <param name="goTo">The url to redirect to if everything validates ok</param>
        /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
        /// <returns>redirect to correct url based on the validation of the form authentication sbl cookie</returns>
        [AllowAnonymous]
        [Produces("text/plain")]
        [ProducesResponseType(StatusCodes.Status302Found)]
        [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(void), StatusCodes.Status503ServiceUnavailable)]
        [HttpGet("authentication")]
        public async Task<ActionResult> AuthenticateUser([FromQuery] string goTo, [FromQuery] bool dontChooseReportee)
        {
            if (string.IsNullOrEmpty(goTo) && HttpContext.Request.Cookies[_generalSettings.AuthnGotToCookieName] != null)
            {
                goTo = HttpContext.Request.Cookies[_generalSettings.AuthnGotToCookieName];
            }

            if (!Uri.TryCreate(goTo, UriKind.Absolute, out Uri goToUri) || !IsValidRedirectUri(goToUri.Host))
            {
                return Redirect($"{_generalSettings.BaseUrl}");
            }

            string platformReturnUrl = $"{_generalSettings.PlatformEndpoint}authentication/api/v1/authentication?goto={goTo}";

            if (dontChooseReportee)
            {
                platformReturnUrl += "&DontChooseReportee=true";
            }

            string encodedGoToUrl = HttpUtility.UrlEncode(platformReturnUrl);
            string sblRedirectUrl = $"{_generalSettings.SBLRedirectEndpoint}?goTo={encodedGoToUrl}";

            string oidcissuer = Request.Query["iss"];
            UserAuthenticationModel userAuthentication;
            if (_generalSettings.EnableOidc && (!string.IsNullOrEmpty(oidcissuer) || _generalSettings.ForceOidc))
            {
                OidcProvider provider = GetOidcProvider(oidcissuer);

                string code = Request.Query["code"];
                string state = Request.Query["state"];

                if (!string.IsNullOrEmpty(code))
                {
                    if (string.IsNullOrEmpty(state))
                    {
                        return BadRequest("Missing state param");
                    }

                    HttpContext.Request.Headers.Add("X-XSRF-TOKEN", state);

                    try
                    {
                        await _antiforgery.ValidateRequestAsync(HttpContext);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogInformation("Validateion of state failed", ex.ToString());
                        return BadRequest("Invalid state param");
                    }

                    OidcCodeResponse oidcCodeResponse = await _oidcProvider.GetTokens(code, provider, GetRedirectUri(provider));
                    JwtSecurityToken jwtSecurityToken = await ValidateAndExtractOidcToken(oidcCodeResponse.IdToken, provider.WellKnownConfigEndpoint);
                    userAuthentication = GetUserFromToken(jwtSecurityToken, provider);
                    if (!ValidateNonce(HttpContext, userAuthentication.Nonce))
                    {
                        return BadRequest("Invalid nonce");
                    }

                    if (userAuthentication.UserID == 0)
                    {
                        await IdentifyOrCreateAltinnUser(userAuthentication, provider);
                    }
                }
                else
                {
                    // Generates state tokens. One is added to a cookie and another is sent as state parameter to OIDC provider
                    AntiforgeryTokenSet tokens = _antiforgery.GetAndStoreTokens(HttpContext);

                    // Create Nonce. One is added to a cookie and another is sent as nonce parameter to OIDC provider
                    string nonce = CreateNonce(HttpContext);
                    CreateGoToCookie(HttpContext, goTo);

                    // Redirect to OIDC Provider
                    return Redirect(CreateAuthenticationRequest(provider, tokens.RequestToken, nonce));
                }
            }
            else
            {
                if (Request.Cookies[_generalSettings.SblAuthCookieName] == null)
                {
                    return Redirect(sblRedirectUrl);
                }

                try
                {
                    string encryptedTicket = Request.Cookies[_generalSettings.SblAuthCookieName];
                    userAuthentication = await _cookieDecryptionService.DecryptTicket(encryptedTicket);
                }
                catch (SblBridgeResponseException sblBridgeException)
                {
                    _logger.LogWarning($"SBL Bridge replied with {sblBridgeException.Response.StatusCode} - {sblBridgeException.Response.ReasonPhrase}");
                    return StatusCode(StatusCodes.Status503ServiceUnavailable);
                }
            }

            if (userAuthentication != null && userAuthentication.IsAuthenticated)
            {
                await CreateTokenCookie(userAuthentication);
                return Redirect(goTo);
            }

            return Redirect(sblRedirectUrl);
        }

        /// <summary>
        /// Refreshes JwtToken.
        /// </summary>
        /// <returns>Ok response with the refreshed token appended.</returns>
        [Authorize]
        [Produces("text/plain")]
        [HttpGet("refresh")]
        [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult> RefreshJwtCookie()
        {
            _logger.LogInformation("Starting to refresh token...");

            ClaimsPrincipal principal = HttpContext.User;

            _logger.LogInformation("Refreshing token....");

            string serializedToken = await GenerateToken(principal);

            _logger.LogInformation("End of refreshing token");

            return Ok(serializedToken);
        }

        /// <summary>
        /// Action for exchanging a JWT generated by a trusted token provider with a new JWT for further use as authentication against rest of Altinn.
        /// </summary>
        /// <returns>The result of the action. Contains the new token if the old token was valid and could be exchanged.</returns>
        [AllowAnonymous]
        [Produces("text/plain")]
        [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(string), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(void), StatusCodes.Status429TooManyRequests)]
        [HttpGet("exchange/{tokenProvider}")]
        public async Task<ActionResult> ExchangeExternalSystemToken(string tokenProvider, [FromQuery] bool test)
        {
            string originalToken = string.Empty;

            string authorization = Request.Headers["Authorization"];

            if (!string.IsNullOrEmpty(authorization))
            {
                _logger.LogInformation("Getting the token from Authorization header");
                if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation("Bearer found");
                    originalToken = authorization.Substring("Bearer ".Length).Trim();
                }
            }

            if (string.IsNullOrEmpty(originalToken))
            {
                _logger.LogInformation("No token found");
                return Unauthorized();
            }

            if (!_validator.CanReadToken(originalToken))
            {
                _logger.LogInformation("Unable to read token");
                return Unauthorized();
            }

            switch (tokenProvider.ToLower())
            {
                case "id-porten":
                    return await AuthenticateIdPortenToken(originalToken);
                case "maskinporten":
                    return await AuthenticateMaskinportenToken(originalToken, test);
                case "altinnstudio":
                    return await AuthenticateAltinnStudioToken(originalToken);
                default:
                    string msg = $"Invalid token provider: {tokenProvider}. Trusted token providers are 'Maskinporten', 'Id-porten' and 'AltinnStudio'.";
                    return BadRequest(msg);
            }
        }

        private async Task<ActionResult> AuthenticateAltinnStudioToken(string originalToken)
        {
            try
            {
                if (!_validator.CanReadToken(originalToken))
                {
                    return Unauthorized();
                }

                JwtSecurityToken jwt = _validator.ReadJwtToken(originalToken);

                if (!jwt.Issuer.Equals("studio") && !jwt.Issuer.Equals("dev-studio") && !jwt.Issuer.Equals("staging-studio"))
                {
                    return Unauthorized();
                }

                IEnumerable<SecurityKey> signingKeys = await _designerSigningKeysResolver.GetSigningKeys(jwt.Issuer);

                TokenValidationParameters validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = signingKeys,
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    RequireExpirationTime = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };

                ClaimsPrincipal originalPrincipal = _validator.ValidateToken(originalToken, validationParameters, out _);

                List<Claim> claims = new List<Claim>();
                foreach (Claim claim in originalPrincipal.Claims)
                {
                    claims.Add(claim);
                }

                ClaimsIdentity identity = new ClaimsIdentity(AltinnStudioIdentity);
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                string serializedToken = await GenerateToken(principal);
                return Ok(serializedToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Altinn Studio authentication failed. {ex.Message}");
                return Unauthorized();
            }
        }

        /// <summary>
        /// Action for exchanging a JWT generated by <c>Maskinporten</c> with a new JWT for further use as authentication against rest of Altinn.
        /// </summary>
        /// <returns>The result of the action. Contains the new token if the old token was valid and could be exchanged.</returns>
        private async Task<ActionResult> AuthenticateMaskinportenToken(string originalToken, bool test)
        {
            try
            {
                ICollection<SecurityKey> signingKeys =
                    await _signingKeysRetriever.GetSigningKeys(_generalSettings.MaskinportenWellKnownConfigEndpoint);

                TokenValidationParameters validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = signingKeys,
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    RequireExpirationTime = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };

                ClaimsPrincipal originalPrincipal = _validator.ValidateToken(originalToken, validationParameters, out _);
                _logger.LogInformation("Token is valid");

                string issOriginal = originalPrincipal.Claims.Where(c => c.Type.Equals(IssClaimName)).Select(c => c.Value).FirstOrDefault();
                if (issOriginal == null || !_generalSettings.MaskinportenWellKnownConfigEndpoint.Contains(issOriginal))
                {
                    _logger.LogInformation("Invalid issuer " + issOriginal);
                    return Unauthorized();
                }

                string orgNumber = GetOrganisationNumberFromConsumerClaim(originalPrincipal);

                if (string.IsNullOrEmpty(orgNumber))
                {
                    _logger.LogInformation("Invalid consumer claim");
                    return Unauthorized();
                }

                List<Claim> claims = new List<Claim>();
                foreach (Claim claim in originalPrincipal.Claims)
                {
                    claims.Add(claim);
                }

                string issuer = _generalSettings.AltinnOidcIssuerUrl;

                string org = null;

                if (HasServiceOwnerScope(originalPrincipal))
                {
                    org = await _organisationService.LookupOrg(orgNumber);
                    if (org == "digdir" && test)
                    {
                        org = "ttd";
                    }

                    if (!string.IsNullOrEmpty(org))
                    {
                        claims.Add(new Claim(AltinnCoreClaimTypes.Org, org, ClaimValueTypes.String, issuer));
                    }
                }

                string authenticatemethod = "maskinporten";

                if (!string.IsNullOrEmpty(Request.Headers["X-Altinn-EnterpriseUser-Authentication"]))
                {
                    string enterpriseUserHeader = Request.Headers["X-Altinn-EnterpriseUser-Authentication"];

                    (UserAuthenticationResult authenticatedEnterpriseUser, ActionResult error) = await HandleEnterpriseUserLogin(enterpriseUserHeader, orgNumber);

                    if (error != null)
                    {
                        return error;
                    }

                    if (authenticatedEnterpriseUser != null)
                    {
                        authenticatemethod = "virksomhetsbruker";

                        string userID = authenticatedEnterpriseUser.UserID.ToString();
                        string username = authenticatedEnterpriseUser.Username;
                        string partyId = authenticatedEnterpriseUser.PartyID.ToString();

                        claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userID, ClaimValueTypes.Integer32, issuer));
                        claims.Add(new Claim(AltinnCoreClaimTypes.UserName, username, ClaimValueTypes.String, issuer));
                        claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, partyId, ClaimValueTypes.Integer32, issuer));
                    }
                }

                claims.Add(new Claim(AltinnCoreClaimTypes.OrgNumber, orgNumber, ClaimValueTypes.Integer32, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, authenticatemethod, ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "3", ClaimValueTypes.Integer32, issuer));

                string[] claimTypesToRemove = { "aud", IssClaimName, "client_amr" };
                foreach (string claimType in claimTypesToRemove)
                {
                    Claim audClaim = claims.Find(c => c.Type == claimType);
                    claims.Remove(audClaim);
                }

                claims.Add(new Claim(IssClaimName, issuer, ClaimValueTypes.String, issuer));

                ClaimsIdentity identity = new ClaimsIdentity(OrganisationIdentity);

                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                string serializedToken = await GenerateToken(principal);
                return Ok(serializedToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Organisation authentication failed. {ex.Message}");
                return Unauthorized();
            }
        }

        private async Task<(UserAuthenticationResult, ActionResult)> HandleEnterpriseUserLogin(string enterpriseUserHeader, string orgNumber)
        {
            EnterpriseUserCredentials credentials;

            try
            {
                credentials = DecodeEnterpriseUserHeader(enterpriseUserHeader, orgNumber);
            }
            catch (Exception)
            {
                return (null, StatusCode(400));
            }

            HttpResponseMessage response = await _enterpriseUserAuthenticationService.AuthenticateEnterpriseUser(credentials);
            string content = await response.Content.ReadAsStringAsync();

            switch (response.StatusCode)
            {
                case System.Net.HttpStatusCode.BadRequest:
                    return (null, StatusCode(400));
                case System.Net.HttpStatusCode.NotFound:
                    ObjectResult result = StatusCode(401, "The user either does not exist or the password is incorrect.");
                    return (null, result);
                case System.Net.HttpStatusCode.TooManyRequests:
                    if (response.Headers.RetryAfter != null)
                    {
                        Response.Headers.Add("Retry-After", response.Headers.RetryAfter.ToString());
                    }

                    return (null, StatusCode(429));
                case System.Net.HttpStatusCode.OK:
                    UserAuthenticationResult userAuthenticationResult = JsonSerializer.Deserialize<UserAuthenticationResult>(content);

                    return (userAuthenticationResult, null);
                default:
                    _logger.LogWarning("Unexpected response from SBLBridge during enterprise user authentication. HttpStatusCode={statusCode} Content={content}", response.StatusCode, content);
                    return (null, StatusCode(502));
            }
        }

        private EnterpriseUserCredentials DecodeEnterpriseUserHeader(string encodedCredentials, string orgNumber)
        {
            byte[] decodedCredentials = Convert.FromBase64String(encodedCredentials);
            string decodedString = Encoding.UTF8.GetString(decodedCredentials);

            string[] decodedStringArray = decodedString.Split(":", 2);
            string usernameFromRequest = decodedStringArray[0];
            string password = decodedStringArray[1];

            EnterpriseUserCredentials credentials = new EnterpriseUserCredentials { UserName = usernameFromRequest, Password = password, OrganizationNumber = orgNumber };
            return credentials;
        }

        /// <summary>
        /// Action for exchanging a JWT generated by <c>ID-porten</c> with a new JWT for further use as authentication against rest of Altinn.
        /// </summary>
        /// <returns>The result of the action. Contains the new token if the old token was valid and could be exchanged.</returns>
        private async Task<ActionResult> AuthenticateIdPortenToken(string originalToken)
        {
            try
            {
                JwtSecurityToken token = await ValidateAndExtractOidcToken(originalToken, _generalSettings.IdPortenWellKnownConfigEndpoint);

                string pid = token.Claims.Where(c => c.Type.Equals(PidClaimName)).Select(c => c.Value).FirstOrDefault();
                string authLevel = token.Claims.Where(c => c.Type.Equals(AuthLevelClaimName)).Select(c => c.Value).FirstOrDefault();
                string authMethod = token.Claims.Where(c => c.Type.Equals(AuthMethodClaimName)).Select(c => c.Value).FirstOrDefault();

                if (string.IsNullOrWhiteSpace(pid) || string.IsNullOrWhiteSpace(authLevel))
                {
                    _logger.LogInformation("Token containted invalid or missing claims.");
                    return Unauthorized();
                }

                if (string.IsNullOrEmpty(authMethod))
                {
                    authMethod = AuthenticationMethod.NotDefined.ToString();
                }

                UserProfile userProfile = await _userProfileService.GetUser(pid);

                string issuer = _generalSettings.AltinnOidcIssuerUrl;

                List<Claim> claims = new List<Claim>();
                claims.Add(new Claim(ClaimTypes.NameIdentifier, userProfile.UserId.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userProfile.UserId.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.UserName, userProfile.UserName, ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, userProfile.PartyId.ToString(), ClaimValueTypes.Integer32, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, authMethod, ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, authLevel.Substring(authLevel.Length - 1, 1), ClaimValueTypes.Integer32, issuer));
                claims.AddRange(token.Claims);

                string[] claimTypesToRemove = { "aud", IssClaimName, "at_hash", "jti", "sub" };
                foreach (string claimType in claimTypesToRemove)
                {
                    Claim claim = claims.Find(c => c.Type == claimType);
                    claims.Remove(claim);
                }

                claims.Add(new Claim(IssClaimName, issuer, ClaimValueTypes.String, issuer));

                ClaimsIdentity identity = new ClaimsIdentity(EndUserSystemIdentity);
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                string serializedToken = await GenerateToken(principal, token.ValidTo);
                return Ok(serializedToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"End user system authentication failed. {ex.Message}");
                return Unauthorized();
            }
        }

        /// <summary>
        /// Creates a session cookie meant to be used to hold the generated JSON Web Token and appends it to the response.
        /// </summary>
        /// <param name="cookieValue">The cookie value.</param>
        private void CreateJwtCookieAndAppendToResponse(string cookieValue)
        {
            CookieBuilder cookieBuilder = new RequestPathBaseCookieBuilder
            {
                Name = _generalSettings.JwtCookieName,
                //// To support OAuth authentication, a lax mode is required, see https://github.com/aspnet/Security/issues/1231.
                SameSite = SameSiteMode.Lax,
                HttpOnly = true,
                SecurePolicy = CookieSecurePolicy.Always,
                IsEssential = true,
                Domain = _generalSettings.HostName
            };

            CookieOptions cookieOptions = cookieBuilder.Build(HttpContext);

            ICookieManager cookieManager = new ChunkingCookieManager();
            cookieManager.AppendResponseCookie(
                HttpContext,
                cookieBuilder.Name,
                cookieValue,
                cookieOptions);

            ApplyHeaders();
        }

        private void ApplyHeaders()
        {
            Response.Headers[HeaderNames.CacheControl] = HeaderValueNoCache;
            Response.Headers[HeaderNames.Pragma] = HeaderValueNoCache;
            Response.Headers[HeaderNames.Expires] = HeaderValueEpocDate;
        }

        /// <summary>
        /// Assumes that the consumer claim follows the ISO 6523. {"Identifier": {"Authority": "iso6523-actorid-upis","ID": "9908:910075918"}}
        /// </summary>
        /// <returns>organisation number found in the ID property of the ISO 6523 record</returns>
        private static string GetOrganisationNumberFromConsumerClaim(ClaimsPrincipal originalPrincipal)
        {
            string consumerJson = originalPrincipal.FindFirstValue("consumer");
            JObject consumer = JObject.Parse(consumerJson);

            string consumerAuthority = consumer["authority"].ToString();
            if (!"iso6523-actorid-upis".Equals(consumerAuthority))
            {
                return null;
            }

            string consumerId = consumer["ID"].ToString();

            string organisationNumber = consumerId.Split(":")[1];
            return organisationNumber;
        }

        private static bool HasServiceOwnerScope(ClaimsPrincipal originalPrincipal)
        {
            string scope = originalPrincipal.FindFirstValue("scope");

            if (scope.Contains("altinn:serviceowner"))
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Checks that url is on same host as platform
        /// </summary>
        /// <param name="goToHost">The url to redirect to</param>
        /// <returns>Boolean verifying that goToHost is on current host. </returns>
        private bool IsValidRedirectUri(string goToHost)
        {
            string validHost = _generalSettings.HostName;
            int segments = _generalSettings.HostName.Split('.').Length;

            List<string> goToList = Enumerable.Reverse(new List<string>(goToHost.Split('.'))).Take(segments).Reverse().ToList();
            string redirectHost = string.Join(".", goToList);

            return validHost.Equals(redirectHost);
        }

        /// <summary>
        /// Generates a token and serialize it to a compact format
        /// </summary>
        /// <param name="principal">The claims principal for the token</param>
        /// <param name="expires">The Expiry time of the token</param>
        /// <returns>A serialized version of the generated JSON Web Token.</returns>
        private async Task<string> GenerateToken(ClaimsPrincipal principal, DateTime? expires = null)
        {
            List<X509Certificate2> certificates = await _certificateProvider.GetCertificates();

            X509Certificate2 certificate = GetLatestCertificateWithRolloverDelay(
                certificates, _generalSettings.JwtSigningCertificateRolloverDelayHours);

            TimeSpan tokenExpiry = new TimeSpan(0, _generalSettings.JwtValidityMinutes, 0);
            if (expires == null)
            {
                expires = DateTime.UtcNow.AddSeconds(tokenExpiry.TotalSeconds);
            }

            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(principal.Identity),
                Expires = expires,
                SigningCredentials = new X509SigningCredentials(certificate)
            };

            SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
            string serializedToken = tokenHandler.WriteToken(token);

            return serializedToken;
        }

        private X509Certificate2 GetLatestCertificateWithRolloverDelay(
            List<X509Certificate2> certificates, int rolloverDelayHours)
        {
            // First limit the search to just those certificates that have existed longer than the rollover delay.
            var rolloverCutoff = DateTime.Now.AddHours(-rolloverDelayHours);
            var potentialCerts =
                certificates.Where(c => c.NotBefore < rolloverCutoff).ToList();

            // If no certs could be found, then widen the search to any usable certificate.
            if (!potentialCerts.Any())
            {
                potentialCerts = certificates.Where(c => c.NotBefore < DateTime.Now).ToList();
            }

            // Of the potential certs, return the newest one.
            return potentialCerts
                .OrderByDescending(c => c.NotBefore)
                .FirstOrDefault();
        }

        private static UserAuthenticationModel GetUserFromToken(JwtSecurityToken jwtSecurityToken, OidcProvider provider)
        {
            UserAuthenticationModel userAuthenticationModel = new UserAuthenticationModel() { IsAuthenticated = true, ProviderClaims = new Dictionary<string, string>(), Iss = provider.IssuerKey };
            foreach (Claim claim in jwtSecurityToken.Claims)
            {
                // General OIDC claims
                if (claim.Type.Equals("nonce"))
                {
                    userAuthenticationModel.Nonce = claim.Value;
                    continue;
                }

                // Altinn Specific claims
                if (claim.Type.Equals(AltinnCoreClaimTypes.UserId))
                {
                    userAuthenticationModel.UserID = Convert.ToInt32(claim.Value);
                    continue;
                }

                if (claim.Type.Equals(AltinnCoreClaimTypes.PartyID))
                {
                    userAuthenticationModel.PartyID = Convert.ToInt32(claim.Value);
                    continue;
                }

                if (claim.Type.Equals(AltinnCoreClaimTypes.AuthenticateMethod))
                {
                    userAuthenticationModel.AuthenticationMethod = (Enum.AuthenticationMethod)System.Enum.Parse(typeof(Enum.AuthenticationMethod), claim.Value);
                    continue;
                }

                if (claim.Type.Equals(AltinnCoreClaimTypes.AuthenticationLevel))
                {
                    userAuthenticationModel.AuthenticationLevel = (Enum.SecurityLevel)System.Enum.Parse(typeof(Enum.SecurityLevel), claim.Value);
                    continue;
                }

                // ID-porten specific claims
                if (claim.Type.Equals("pid"))
                {
                    userAuthenticationModel.SSN = claim.Value;
                    continue;
                }

                if (claim.Type.Equals("amr"))
                {
                    userAuthenticationModel.AuthenticationMethod = GetAuthenticationMethod(claim.Value);
                    continue;
                }

                if (claim.Type.Equals("acr"))
                {
                    userAuthenticationModel.AuthenticationLevel = GetAuthenticationLevel(claim.Value);
                    continue;
                }

                if (!string.IsNullOrEmpty(provider.ExternalIdentityClaim) && claim.Type.Equals(provider.ExternalIdentityClaim))
                {
                    userAuthenticationModel.ExternalIdentity = claim.Value;
                    continue;
                }

                // General claims handling
                if (provider.ProviderClaims != null && provider.ProviderClaims.Contains(claim.Type))
                {
                    userAuthenticationModel.ProviderClaims.Add(claim.Type, claim.Value);
                }
            }

            return userAuthenticationModel;
        }

        private async Task IdentifyOrCreateAltinnUser(UserAuthenticationModel userAuthenticationModel, OidcProvider provider)
        {
            UserProfile profile = null;

            if (!string.IsNullOrEmpty(userAuthenticationModel.ExternalIdentity))
            {
                string issExternalIdentity = userAuthenticationModel.Iss + ":" + userAuthenticationModel.ExternalIdentity;
                profile = await _userProfileService.GetUser(issExternalIdentity);

                if (profile != null)
                {
                    userAuthenticationModel.UserID = profile.UserId;
                    userAuthenticationModel.PartyID = profile.PartyId;
                    return;
                }

                UserProfile userToCreate = new UserProfile();
                userToCreate.ExternalIdentity = issExternalIdentity;
                userToCreate.UserName = CreateUserName(userAuthenticationModel, provider);
                userToCreate.UserType = Profile.Enums.UserType.SelfIdentified;

                UserProfile userCreated = await _userProfileService.CreateUser(userToCreate);
                userAuthenticationModel.UserID = userCreated.UserId;
                userAuthenticationModel.PartyID = userCreated.PartyId;
             }
        }

        /// <summary>
        /// Creates a automatic username based on external identity and prefix.
        /// </summary>
        private static string CreateUserName(UserAuthenticationModel userAuthenticationModel, OidcProvider provider)
        {
            string hashedIdentity = HashNonce(userAuthenticationModel.ExternalIdentity).Substring(5, 10);
            Regex rgx = new Regex("[^a-zA-Z0-9 -]");
            hashedIdentity = rgx.Replace(hashedIdentity, string.Empty);

            return provider.UserNamePrefix + hashedIdentity.ToLower() + DateTime.Now.Millisecond;
        }

        /// <summary>
        /// Converts IDporten acr claim �Authentication Context Class Reference� - The security level of assurance for the
        /// authentication. Possible values are Level3 (i.e. MinID was used) or Level4 (other eIDs).
        /// The level must be validated by the client.
        /// </summary>
        private static SecurityLevel GetAuthenticationLevel(string acr)
        {
            switch (acr)
            {
                case "Level3":
                    return Enum.SecurityLevel.Sensitive;
                case "Level4":
                    return Enum.SecurityLevel.VerySensitive;
            }

            return SecurityLevel.SelfIdentifed;
        }

        /// <summary>
        /// Converts external methods to internal  Minid-PIN, Minid-OTC, Commfides, Buypass, BankID, BankID Mobil or eIDAS
        /// </summary>
        private static AuthenticationMethod GetAuthenticationMethod(string amr)
        {
            switch (amr)
            {
                case "Minid-PIN":
                    return Enum.AuthenticationMethod.MinIDPin;
                case "Minid-OTC":
                    return Enum.AuthenticationMethod.MinIDOTC;
                case "Commfides":
                    return Enum.AuthenticationMethod.Commfides;
                case "Buypass":
                    return Enum.AuthenticationMethod.BuyPass;
                case "BankID":
                    return Enum.AuthenticationMethod.BankID;
                case "BankID Mobil":
                    return Enum.AuthenticationMethod.BankIDMobil;
                case "eIDAS":
                    return Enum.AuthenticationMethod.EIDAS;
            }

            return Enum.AuthenticationMethod.NotDefined;
        }

        private async Task<JwtSecurityToken> ValidateAndExtractOidcToken(string originalToken, string wellKnownConfigEndpoint)
        {
            ICollection<SecurityKey> signingKeys =
               await _signingKeysRetriever.GetSigningKeys(wellKnownConfigEndpoint);

            return ValidateToken(originalToken, signingKeys);
        }

        private JwtSecurityToken ValidateToken(string originalToken, ICollection<SecurityKey> signingKeys)
        {
            TokenValidationParameters validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = signingKeys,
                ValidateIssuer = false,
                ValidateAudience = false,
                RequireExpirationTime = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            _validator.ValidateToken(originalToken, validationParameters, out _);
            _logger.LogInformation("Token is valid");

            JwtSecurityToken token = _validator.ReadJwtToken(originalToken);
            return token;
        }

        /// <summary>
        /// Find the OIDC provider based on given ISS or default oidc provider.
        /// </summary>
        private OidcProvider GetOidcProvider(string iss)
        {
            if (!string.IsNullOrEmpty(iss) && _oidcProviderSettings.ContainsKey(iss))
            {
                return _oidcProviderSettings[iss];
            }

            if (!string.IsNullOrEmpty(iss))
            {
                foreach (KeyValuePair<string, OidcProvider> kvp in _oidcProviderSettings)
                {
                    if (kvp.Value.Issuer.Equals(iss))
                    {
                        return kvp.Value;
                    }
                }
            }

            if (!string.IsNullOrEmpty(_generalSettings.DefaultOidcProvider) && _oidcProviderSettings.ContainsKey(_generalSettings.DefaultOidcProvider))
            {
                return _oidcProviderSettings[_generalSettings.DefaultOidcProvider];
            }

            return _oidcProviderSettings.First().Value;
        }

        /// <summary>
        /// Builds URI to redirect for OIDC login for authentication
        /// Based on https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
        /// </summary>
        private string CreateAuthenticationRequest(OidcProvider provider, string state, string nonce)
        {
            string redirect_uri = GetRedirectUri(provider);
            string authorizationEndpoint = provider.AuthorizationEndpoint;
            Dictionary<string, string> oidcParams = new Dictionary<string, string>();

            // REQUIRED. Redirection URI to which the response will be sent. This URI MUST exactly match one of the Redirection URI
            // values for the Client pre-registered at the OpenID Provider, with the matching performed as described in Section 6.2.1 of
            // [RFC3986] (Simple String Comparison). When using this flow, the Redirection URI SHOULD use the https scheme; however,
            // it MAY use the http scheme, provided that the Client Type is confidential, as defined in Section 2.1 of OAuth 2.0, and
            // provided the OP allows the use of http Redirection URIs in this case. The Redirection URI MAY use an alternate scheme,
            // such as one that is intended to identify a callback into a native application.
            if (!authorizationEndpoint.Contains("?"))
            {
                authorizationEndpoint += "?redirect_uri=" + redirect_uri;
            }
            else
            {
                authorizationEndpoint += "&redirect_uri=" + redirect_uri;
            }

            // REQUIRED. OpenID Connect requests MUST contain the openid scope value. If the openid scope value is not present,
            // the behavior is entirely unspecified. Other scope values MAY be present.
            // Scope values used that are not understood by an implementation SHOULD be ignored.
            // See Sections 5.4 and 11 for additional scope values defined by this specification.
            oidcParams.Add("scope", provider.Scope);

            // REQUIRED. OAuth 2.0 Client Identifier valid at the Authorization Server.
            oidcParams.Add("client_id", provider.ClientId);

            // REQUIRED. OAuth 2.0 Response Type value that determines the authorization processing flow to be used, including what parameters
            // are returned from the endpoints used. When using the Authorization Code Flow, this value is code.
            oidcParams.Add("response_type", provider.ResponseType);

            // RECOMMENDED. Opaque value used to maintain state between the request and the callback.
            // Typically, Cross-Site Request Forgery (CSRF, XSRF)
            // mitigation is done by cryptographically binding the value of this parameter with a browser cookie.
            oidcParams.Add("state", state);

            // OPTIONAL. String value used to associate a Client session with an ID Token, and to mitigate replay attacks.
            // The value is passed through unmodified from the Authentication Request to the ID Token.
            // Sufficient entropy MUST be present in the nonce values used to prevent attackers
            // from guessing values. For implementation notes, see Section 15.5.2.
            oidcParams.Add("nonce", nonce);
            string uri = QueryHelpers.AddQueryString(authorizationEndpoint, oidcParams);

            return uri;
        }

        private string GetRedirectUri(OidcProvider provider)
        {
            string redirectUri = $"{_generalSettings.PlatformEndpoint}authentication/api/v1/authentication";

            if (provider.IncludeIssInRedirectUri)
            {
                redirectUri = redirectUri + "?iss=" + provider.IssuerKey;
            }

            return redirectUri;
        }

        private string CreateNonce(HttpContext httpContext)
        {
            string nonce = Guid.NewGuid().ToString();
            httpContext.Response.Cookies.Append(_generalSettings.OidcNonceCookieName, nonce);
            return HashNonce(nonce);
        }

        private void CreateGoToCookie(HttpContext httpContext, string goToUrl)
        {
            httpContext.Response.Cookies.Append(_generalSettings.AuthnGotToCookieName, goToUrl);
        }

        private async Task CreateTokenCookie(UserAuthenticationModel userAuthentication)
        {
            List<Claim> claims = new List<Claim>();
            string issuer = _generalSettings.AltinnOidcIssuerUrl;
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userAuthentication.UserID.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userAuthentication.UserID.ToString(), ClaimValueTypes.String, issuer));

            if (!string.IsNullOrEmpty(userAuthentication.Username))
            {
                claims.Add(new Claim(AltinnCoreClaimTypes.UserName, userAuthentication.Username, ClaimValueTypes.String, issuer));
            }

            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, userAuthentication.PartyID.ToString(), ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, userAuthentication.AuthenticationMethod.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, ((int)userAuthentication.AuthenticationLevel).ToString(), ClaimValueTypes.Integer32, issuer));

            if (userAuthentication.ProviderClaims != null && userAuthentication.ProviderClaims.Count > 0)
            {
                foreach (KeyValuePair<string, string> kvp in userAuthentication.ProviderClaims)
                {
                    claims.Add(new Claim(kvp.Key, kvp.Value, ClaimValueTypes.String, issuer));
                }
            }

            ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.ClaimsIdentity);
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            string serializedToken = await GenerateToken(principal);
            CreateJwtCookieAndAppendToResponse(serializedToken);
            if (userAuthentication.TicketUpdated)
            {
                Response.Cookies.Append(_generalSettings.SblAuthCookieName, userAuthentication.EncryptedTicket);
            }
        }

        private static string HashNonce(string nonce)
        {
            using (SHA256 nonceHash = SHA256Managed.Create())
            {
                byte[] byteArrayResultOfRawData = Encoding.UTF8.GetBytes(nonce);
                byte[] byteArrayResult = nonceHash.ComputeHash(byteArrayResultOfRawData);
                return Convert.ToBase64String(byteArrayResult);
            }
        }

        private bool ValidateNonce(HttpContext context, string hashedNonce)
        {
            string nonceCookie = context.Request.Cookies[_generalSettings.OidcNonceCookieName];
            if (!string.IsNullOrEmpty(nonceCookie) && HashNonce(nonceCookie).Equals(hashedNonce))
            {
                return true;
            }

            return false;
        }
    }
}
