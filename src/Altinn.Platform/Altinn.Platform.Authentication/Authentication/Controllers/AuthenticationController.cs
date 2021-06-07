using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using System.Text;
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

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;
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
        private readonly JwtSecurityTokenHandler _validator;
        private readonly ISigningKeysResolver _designerSigningKeysResolver;

        /// <summary>
        /// Initialises a new instance of the <see cref="AuthenticationController"/> class with the given dependencies.
        /// </summary>
        /// <param name="logger">A generic logger</param>
        /// <param name="generalSettings">Configuration for the authentication scope.</param>
        /// <param name="cookieDecryptionService">A service that can decrypt a .ASPXAUTH cookie.</param>
        /// <param name="organisationRepository">the repository object that holds valid organisations</param>
        /// <param name="certificateProvider">Service that can obtain a list of certificates that can be used to generate JSON Web Tokens.</param>
        /// <param name="userProfileService">Service that can retrieve user profiles.</param>
        /// <param name="signingKeysRetriever">The class to use to obtain the signing keys.</param>
        /// <param name="signingKeysResolver">Signing keys resolver for Altinn Common AccessToken</param>
        public AuthenticationController(
            ILogger<AuthenticationController> logger,
            IOptions<GeneralSettings> generalSettings,
            ISigningKeysRetriever signingKeysRetriever,
            IJwtSigningCertificateProvider certificateProvider,
            ISblCookieDecryptionService cookieDecryptionService,
            IUserProfileService userProfileService,
            IOrganisationsService organisationRepository,
            ISigningKeysResolver signingKeysResolver)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            _signingKeysRetriever = signingKeysRetriever;
            _certificateProvider = certificateProvider;
            _cookieDecryptionService = cookieDecryptionService;
            _organisationService = organisationRepository;
            _userProfileService = userProfileService;
            _designerSigningKeysResolver = signingKeysResolver;
            _validator = new JwtSecurityTokenHandler();
        }

        /// <summary>
        /// Request that handles the form authentication cookie from SBL
        /// </summary>
        /// <param name="goTo">The url to redirect to if everything validates ok</param>
        /// <returns>redirect to correct url based on the validation of the form authentication sbl cookie</returns>
        [AllowAnonymous]
        [HttpGet("authentication")]
        public async Task<ActionResult> AuthenticateUser(string goTo)
        {
            if (!Uri.TryCreate(goTo, UriKind.Absolute, out Uri goToUri) || !IsValidRedirectUri(goToUri.Host))
            {
                return Redirect($"{_generalSettings.GetBaseUrl}");
            }

            string encodedGoToUrl = HttpUtility.UrlEncode($"{_generalSettings.PlatformEndpoint}authentication/api/v1/authentication?goto={goTo}");
            if (Request.Cookies[_generalSettings.SblAuthCookieName] == null)
            {
                return Redirect($"{_generalSettings.GetSBLRedirectEndpoint}?goTo={encodedGoToUrl}");
            }

            UserAuthenticationModel userAuthentication;
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

            if (userAuthentication != null && userAuthentication.IsAuthenticated)
            {
                List<Claim> claims = new List<Claim>();
                string issuer = _generalSettings.PlatformEndpoint;
                claims.Add(new Claim(ClaimTypes.NameIdentifier, userAuthentication.UserID.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userAuthentication.UserID.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.UserName, userAuthentication.Username, ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, userAuthentication.PartyID.ToString(), ClaimValueTypes.Integer32, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, userAuthentication.AuthenticationMethod.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, ((int)userAuthentication.AuthenticationLevel).ToString(), ClaimValueTypes.Integer32, issuer));

                ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                _logger.LogInformation("Platform Authentication before creating JwtCookie");

                string serializedToken = await GenerateToken(principal);
                CreateJwtCookieAndAppendToResponse(serializedToken);

                _logger.LogInformation("Platform Authentication after creating JwtCookie");

                _logger.LogInformation($"TicketUpdated: {userAuthentication.TicketUpdated}");
                if (userAuthentication.TicketUpdated)
                {
                    Response.Cookies.Append(_generalSettings.SblAuthCookieName, userAuthentication.EncryptedTicket);
                }

                return Redirect(goTo);
            }

            return Redirect($"{_generalSettings.GetSBLRedirectEndpoint}?goTo={encodedGoToUrl}");
        }

        /// <summary>
        /// Refreshes JwtToken.
        /// </summary>
        /// <returns>Ok response with the refreshed token appended.</returns>
        [Authorize]
        [HttpGet("refresh")]
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

                if (!jwt.Issuer.Equals("studio") && !jwt.Issuer.Equals("dev-studio"))
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
                    await _signingKeysRetriever.GetSigningKeys(_generalSettings.GetMaskinportenWellKnownConfigEndpoint);

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
                if (issOriginal == null || !_generalSettings.GetMaskinportenWellKnownConfigEndpoint.Contains(issOriginal))
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

                string issuer = _generalSettings.PlatformEndpoint;

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

                claims.Add(new Claim(AltinnCoreClaimTypes.OrgNumber, orgNumber, ClaimValueTypes.Integer32, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "maskinporten", ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "3", ClaimValueTypes.Integer32, issuer));

                string[] claimTypesToRemove = { "aud", "iss", "client_amr" };
                foreach (string claimType in claimTypesToRemove)
                {
                    Claim audClaim = claims.Find(c => c.Type == claimType);
                    claims.Remove(audClaim);
                }

                claims.Add(new Claim("iss", issuer, ClaimValueTypes.String, issuer));

                ClaimsIdentity identity = new ClaimsIdentity(OrganisationIdentity);

                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                if (!string.IsNullOrEmpty(Request.Headers["X-Altinn-EnterpriseUser-Authentication"]))
                {
                    string enterpriseUserHeader = Request.Headers["X-Altinn-EnterpriseUser-Authentication"];
                    byte[] decodedCredentials = Convert.FromBase64String(enterpriseUserHeader);
                    string decodedString = Encoding.UTF8.GetString(decodedCredentials);
                    string[] decodedStringArray = decodedString.Split(":");
                    string username = decodedStringArray[0];
                    string password = decodedStringArray[1];

                    string bridgeApiEndpoint = _generalSettings.BridgeAuthnApiEndpoint + "enterpriseuser";

                    EnterpriseUserCredentials credentials = new EnterpriseUserCredentials { UserName = username, Password = password };

                    HttpClient client = new HttpClient();
                    var credentialsJson = JsonConvert.SerializeObject(credentials);

                    var request = new HttpRequestMessage
                    {
                        Method = HttpMethod.Post,
                        RequestUri = new Uri(bridgeApiEndpoint),
                        Content = new StringContent(credentialsJson, Encoding.UTF8, "application/json")
                    };

                    var response = client.SendAsync(request).ConfigureAwait(false);
                    var responseInfo = response.GetAwaiter().GetResult();

                    if (responseInfo.StatusCode.ToString() == "200")
                    {
                        return Ok(); //TODO: Må her returneres Altinn3-token dersom statuskode er 200 og en UserProfile-modell.
                    }
                }

                string serializedToken = await GenerateToken(principal);
                return Ok(serializedToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Organisation authentication failed. {ex.Message}");
                return Unauthorized();
            }
        }

        /// <summary>
        /// Action for exchanging a JWT generated by <c>ID-porten</c> with a new JWT for further use as authentication against rest of Altinn.
        /// </summary>
        /// <returns>The result of the action. Contains the new token if the old token was valid and could be exchanged.</returns>
        private async Task<ActionResult> AuthenticateIdPortenToken(string originalToken)
        {
            try
            {
                ICollection<SecurityKey> signingKeys =
                   await _signingKeysRetriever.GetSigningKeys(_generalSettings.IdPortenWellKnownConfigEndpoint);

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

                List<Claim> claims = new List<Claim>();
                string issuer = _generalSettings.PlatformEndpoint;
                claims.Add(new Claim(ClaimTypes.NameIdentifier, userProfile.UserId.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userProfile.UserId.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.UserName, userProfile.UserName, ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, userProfile.PartyId.ToString(), ClaimValueTypes.Integer32, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, authMethod, ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, authLevel.Substring(authLevel.Length - 1, 1), ClaimValueTypes.Integer32, issuer));
                claims.AddRange(token.Claims);

                string[] claimTypesToRemove = { "aud", "iss", "at_hash", "jti", "sub" };
                foreach (string claimType in claimTypesToRemove)
                {
                    Claim claim = claims.Find(c => c.Type == claimType);
                    claims.Remove(claim);
                }

                claims.Add(new Claim("iss", issuer, ClaimValueTypes.String, issuer));

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
            string validHost = _generalSettings.GetHostName;
            int segments = _generalSettings.GetHostName.Split('.').Length;

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
    }
}
