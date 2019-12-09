using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Repositories;
using Altinn.Platform.Authentication.Services;

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

        private readonly ILogger _logger;
        private readonly IOrganisationRepository _organisationRepository;
        private readonly ISigningCredentialsProvider _credentialsProvider;
        private readonly ISblCookieDecryptionService _cookieDecryptionService;
        private readonly ISigningKeysRetriever _signingKeysRetriever;

        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initialises a new instance of the <see cref="AuthenticationController"/> class with the given dependencies.
        /// </summary>
        /// <param name="logger">A generic logger</param>
        /// <param name="generalSettings">Configuration for the authentication scope.</param>
        /// <param name="cookieDecryptionService">A service that can decrypt a .ASPXAUTH cookie.</param>
        /// <param name="organisationRepository">the repository object that holds valid organisations</param>
        /// <param name="credentialsProvider">Service that can obtain the correct <see cref="SigningCredentials"/>.</param>
        /// <param name="signingKeysRetriever">The class to use to obtain the signing keys.</param>
        public AuthenticationController(
            ILogger<AuthenticationController> logger,
            IOptions<GeneralSettings> generalSettings,
            ISigningKeysRetriever signingKeysRetriever,
            ISigningCredentialsProvider credentialsProvider,
            ISblCookieDecryptionService cookieDecryptionService,
            IOrganisationRepository organisationRepository)
        {
            _logger = logger;
            _generalSettings = generalSettings.Value;
            _signingKeysRetriever = signingKeysRetriever;
            _credentialsProvider = credentialsProvider;
            _cookieDecryptionService = cookieDecryptionService;
            _organisationRepository = organisationRepository;
        }

        /// <summary>
        /// Request that handles the form authentication cookie from SBL
        /// </summary>
        /// <param name="goTo">The url to redirect to if everything validates ok</param>
        /// <returns>redirect to correct url based on the validation of the form authentication sbl cookie</returns>
        [HttpGet("authentication")]
        public async Task<ActionResult> AuthenticateUser(string goTo)
        {
            if (!IsValidRedirectUri(new Uri(goTo).Host))
            {
                return Redirect($"{_generalSettings.GetBaseUrl}");
            }

            string encodedGoToUrl = HttpUtility.UrlEncode($"{_generalSettings.GetPlatformEndpoint}authentication/api/v1/authentication?goto={goTo}");
            if (Request.Cookies[_generalSettings.GetSBLCookieName] == null)
            {
                return Redirect($"{_generalSettings.GetSBLRedirectEndpoint}?goTo={encodedGoToUrl}");
            }

            string encryptedTicket = Request.Cookies[_generalSettings.GetSBLCookieName];
            UserAuthenticationModel userAuthentication = await _cookieDecryptionService.DecryptTicket(encryptedTicket);

            if (userAuthentication != null && userAuthentication.IsAuthenticated)
            {
                List<Claim> claims = new List<Claim>();
                string issuer = _generalSettings.GetPlatformEndpoint;
                claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userAuthentication.UserID.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.UserName, userAuthentication.Username, ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, userAuthentication.PartyID.ToString(), ClaimValueTypes.Integer32, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, userAuthentication.AuthenticationMethod.ToString(), ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, ((int)userAuthentication.AuthenticationLevel).ToString(), ClaimValueTypes.Integer32, issuer));

                ClaimsIdentity identity = new ClaimsIdentity(_generalSettings.GetClaimsIdentity);
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                _logger.LogInformation("Platform Authentication before signin async");
                await SignInAsync(
                    principal,
                    new AuthenticationProperties
                    {
                        ExpiresUtc = DateTime.UtcNow.AddMinutes(int.Parse(_generalSettings.GetJwtCookieValidityTime)),
                        IsPersistent = false,
                        AllowRefresh = false,
                    });

                _logger.LogInformation("Platform Authentication after signin async");
                _logger.LogInformation($"TicketUpdated: {userAuthentication.TicketUpdated}");

                if (userAuthentication.TicketUpdated)
                {
                    Response.Cookies.Append(_generalSettings.GetSBLCookieName, userAuthentication.EncryptedTicket);
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
           
            string token = await GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(_generalSettings.GetJwtCookieValidityTime), 0));
            _logger.LogInformation("End of refreshing token");
            return Ok(token);
        }

        /// <summary>
        /// Action for converting a JWT generated by <c>Maskinporten</c> with a new JWT for further use as authentication against rest of Altinn.
        /// </summary>
        /// <returns>The result of the action. Contains the new token if the old token was valid and could be converted.</returns>
        [HttpGet("convert")]
        public async Task<IActionResult> AuthenticateOrganisation()
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

            JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();

            if (!validator.CanReadToken(originalToken))
            {
                _logger.LogInformation("Unable to read token");
                return Unauthorized();
            }

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
                    ValidateLifetime = true
                };

                ClaimsPrincipal originalPrincipal = validator.ValidateToken(originalToken, validationParameters, out _);
                _logger.LogInformation("Token is valid");

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

                string org = _organisationRepository.LookupOrg(orgNumber);

                string issuer = _generalSettings.GetPlatformEndpoint;
                claims.Add(new Claim(AltinnCoreClaimTypes.Org, org, ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.OrgNumber, orgNumber, ClaimValueTypes.Integer32, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "maskinporten", ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "3", ClaimValueTypes.Integer32, issuer));

                string[] claimTypesToRemove = { "aud", "iss", "client_amr" };
                foreach (string claimType in claimTypesToRemove)
                {
                    Claim audClaim = claims.Find(c => c.Type == claimType);
                    claims.Remove(audClaim);
                }

                ClaimsIdentity identity = new ClaimsIdentity(OrganisationIdentity);
               
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                string serializedToken = await GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(_generalSettings.GetJwtCookieValidityTime), 0));

                // ToDo: https://stackoverflow.com/questions/19790588/how-do-i-prevent-readasstringasync-returning-a-doubly-escaped-string/19792791#19792791
                return Ok(serializedToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Organisation authentication failed. {ex.Message}");
                return Unauthorized();
            }
        }

        /// <summary>
        /// Handles when a user is signing in
        /// </summary>
        /// <param name="user">The user</param>
        /// <param name="properties">The authentication properties</param>
        /// <returns></returns>
        protected async Task SignInAsync(ClaimsPrincipal user, AuthenticationProperties properties)
        {
            CookieBuilder cookieBuilder = new RequestPathBaseCookieBuilder
            {
                // To support OAuth authentication, a lax mode is required, see https://github.com/aspnet/Security/issues/1231.
                SameSite = SameSiteMode.Lax,
                HttpOnly = true,
                SecurePolicy = CookieSecurePolicy.SameAsRequest,
                IsEssential = true,
                Name = "AltinnStudioRuntime",
                Domain = _generalSettings.HostName
            };

            CookieOptions cookieOptions = cookieBuilder.Build(HttpContext);

            DateTimeOffset issuedUtc = DateTimeOffset.UtcNow;

            TimeSpan tokenExipry = new TimeSpan(0, 30, 0);

            DateTimeOffset expiresUtc = properties.ExpiresUtc ?? issuedUtc.Add(tokenExipry);
            cookieOptions.Expires = expiresUtc.ToUniversalTime();

            string jwtToken = await GenerateToken(user, tokenExipry);

            ICookieManager cookieManager = new ChunkingCookieManager();
            cookieManager.AppendResponseCookie(
                HttpContext,
                cookieBuilder.Name,
                jwtToken,
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
        /// Generates a token
        /// </summary>
        /// <param name="principal">the claims principal</param>
        /// <param name="tokenExipry">validity time span for the token</param>
        /// <returns></returns>
        private async Task<string> GenerateToken(ClaimsPrincipal principal, TimeSpan tokenExipry)
        {
            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(principal.Identity),
                Expires = DateTime.UtcNow.AddSeconds(tokenExipry.TotalSeconds),
                SigningCredentials = await _credentialsProvider.GetSigningCredentials()
            };

            SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
            string serializedToken = tokenHandler.WriteToken(token);

            return serializedToken;
        }
    }
}
