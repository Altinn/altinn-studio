using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Web;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Maskinporten;
using Altinn.Platform.Authentication.Model;

using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Handles the authentication of requests to platform
    /// </summary>
    [Route("authentication/api/v1")]
    [ApiController]
    public class AuthenticationController : ControllerBase
    {
        private const string ALTINN_ORGS_LOCATION = "https://altinncdn.no/orgs/altinn-orgs.json";
        private static Dictionary<string, string> orgNumberToOrg = new Dictionary<string, string>();
        private static readonly HttpClient HttpClient = new HttpClient();

        private static DateTime dictionaryLastUpdated = DateTime.MinValue;

        private readonly ILogger logger;
        private readonly GeneralSettings generalSettings;
        private readonly JwtCookieHandler jwtHandler;
        private readonly ISigningKeysRetriever signinKeysRetriever;

        /// <summary>
        /// Initialises a new instance of the <see cref="AuthenticationController"/> class with the given dependencies.
        /// </summary>
        /// <param name="logger">A generic logger</param>
        /// <param name="generalSettings">Configuration for the authentication scope.</param>
        /// <param name="jwtHandler">the handler for jwt cookie authentication</param>
        /// <param name="signinKeysRetriever">The class to use to obtain the signing keys.</param>
        public AuthenticationController(ILogger<AuthenticationController> logger, IOptions<GeneralSettings> generalSettings, JwtCookieHandler jwtHandler, ISigningKeysRetriever signinKeysRetriever)
        {
            this.logger = logger;
            this.generalSettings = generalSettings.Value;
            this.jwtHandler = jwtHandler;
            this.signinKeysRetriever = signinKeysRetriever;
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
                return Redirect($"{generalSettings.GetBaseUrl}");
            }

            string encodedGoToUrl = HttpUtility.UrlEncode($"{generalSettings.GetPlatformEndpoint}authentication/api/v1/authentication?goto={goTo}");
            if (Request.Cookies[generalSettings.GetSBLCookieName] == null)
            {
                return Redirect($"{generalSettings.GetSBLRedirectEndpoint}?goTo={encodedGoToUrl}");
            }

            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserAuthenticationModel));
            Uri endpointUrl = new Uri($"{generalSettings.GetBridgeApiEndpoint}tickets");

            logger.LogInformation($"Authentication - Before getting userdata");
            string userData = JsonConvert.SerializeObject(new UserAuthenticationModel() { EncryptedTicket = Request.Cookies[generalSettings.GetSBLCookieName] });
            logger.LogInformation($"Authentication - endpoint {endpointUrl}");
            HttpResponseMessage response = await HttpClient.PostAsync(endpointUrl, new StringContent(userData, Encoding.UTF8, "application/json"));
            logger.LogInformation($"Authentication - response {response.StatusCode}");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                Stream stream = await response.Content.ReadAsStreamAsync();
                UserAuthenticationModel userAuthentication = serializer.ReadObject(stream) as UserAuthenticationModel;
                logger.LogInformation($"USerAuthentication: {userAuthentication.IsAuthenticated}");
                if (userAuthentication.IsAuthenticated)
                {
                    List<Claim> claims = new List<Claim>();
                    string issuer = generalSettings.GetPlatformEndpoint;
                    claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userAuthentication.UserID.ToString(), ClaimValueTypes.String, issuer));
                    claims.Add(new Claim(AltinnCoreClaimTypes.UserName, userAuthentication.Username, ClaimValueTypes.String, issuer));
                    claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, userAuthentication.PartyID.ToString(), ClaimValueTypes.Integer32, issuer));
                    claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, userAuthentication.AuthenticationMethod.ToString(), ClaimValueTypes.String, issuer));
                    claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, ((int)userAuthentication.AuthenticationLevel).ToString(), ClaimValueTypes.Integer32, issuer));

                    ClaimsIdentity identity = new ClaimsIdentity(generalSettings.GetClaimsIdentity);
                    identity.AddClaims(claims);
                    ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                    logger.LogInformation($"Platform Authentication before signin async");
                    await HttpContext.SignInAsync(
                        JwtCookieDefaults.AuthenticationScheme,
                        principal,
                        new AuthenticationProperties
                        {
                            ExpiresUtc = DateTime.UtcNow.AddMinutes(int.Parse(generalSettings.GetJwtCookieValidityTime)),
                            IsPersistent = false,
                            AllowRefresh = false,
                        });

                    logger.LogInformation($"Platform Authentication after signin async");
                    logger.LogInformation($"TicketUpdated: {userAuthentication.TicketUpdated}");
                    if (userAuthentication.TicketUpdated)
                    {
                        Response.Cookies.Append(generalSettings.GetSBLCookieName, userAuthentication.EncryptedTicket);
                    }

                    return Redirect(goTo);
                }

                // If user is not authenticated redirect to login
                logger.LogInformation($"UserNotAuthenticated");
                logger.LogError($"Getting the authenticated user failed with statuscode {response.StatusCode}");
                return Redirect($"{generalSettings.GetSBLRedirectEndpoint}?goTo={encodedGoToUrl}");
            }

            return Redirect($"{generalSettings.GetSBLRedirectEndpoint}?goTo={encodedGoToUrl}");            
        }

        /// <summary>
        /// Refreshes JwtToken.
        /// </summary>
        /// <returns>Ok response with the refreshed token appended.</returns>
        [Authorize]
        [HttpGet("refresh")]
        public ActionResult RefreshJWTCookie()
        {
            logger.LogInformation($"Starting to refresh token...");
            ClaimsPrincipal principal = HttpContext.User;
            logger.LogInformation("Refreshing token....");
           
            string token = jwtHandler.GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(generalSettings.GetJwtCookieValidityTime), 0));
            logger.LogInformation($"End of refreshing token");
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
                logger.LogInformation($"Getting the token from Authorization header");
                if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    logger.LogInformation($"Bearer found");
                    originalToken = authorization.Substring("Bearer ".Length).Trim();
                }
            }

            if (string.IsNullOrEmpty(originalToken))
            {
                logger.LogInformation($"No token found");
                return Unauthorized();
            }

            JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();

            if (!validator.CanReadToken(originalToken))
            {
                logger.LogInformation($"Unable to read token");
                return Unauthorized();
            }

            try
            {
                ICollection<SecurityKey> signingKeys =
                    await signinKeysRetriever.GetSigningKeys(generalSettings.GetMaskinportenWellKnownConfigEndpoint);

                logger.LogInformation($"Token to be validated {originalToken}");
                TokenValidationParameters validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = signingKeys,
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    RequireExpirationTime = true,
                    ValidateLifetime = true
                };

                ClaimsPrincipal originalPrincipal = validator.ValidateToken(originalToken, validationParameters, out SecurityToken validatedToken);
                logger.LogInformation($"validated token{validatedToken}");

                string organisationNumber = GetOrganisationNumberFromConsumerClaim(originalPrincipal);

                if (string.IsNullOrEmpty(organisationNumber))
                {
                    logger.LogInformation("Invalid consumer claim {");
                    return Unauthorized();
                }

                List<Claim> claims = new List<Claim>();
                foreach (Claim claim in originalPrincipal.Claims)
                {
                    claims.Add(claim);
                }

                string org = LookupOrg(organisationNumber);

                claims.Add(new Claim("org", org));
                claims.Add(new Claim("orgNumber", organisationNumber));

                claims.Add(new Claim("iss", "https://platform.altinn.cloud/"));

                string[] claimTypesToRemove = { "aud", "iss", "client_amr" };
                foreach (string claimType in claimTypesToRemove)
                {
                    Claim audClaim = claims.Find(c => c.Type == claimType);
                    claims.Remove(audClaim);
                }

                ClaimsIdentity identity = new ClaimsIdentity("OrganisationLogin");
               
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                string token = jwtHandler.GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(generalSettings.GetJwtCookieValidityTime), 0));

                return Ok(token);
            }
            catch (Exception ex)
            {
                logger.LogWarning($"Organisation authentication failed. {ex.Message}");
                return Unauthorized();
            }
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

            string consumerID = consumer["ID"].ToString();

            string organisationNumber = consumerID.Split(":")[1];
            return organisationNumber;
        }

        /// <summary>
        /// Checks that url is on same host as platform
        /// </summary>
        /// <param name="goToHost">The url to redirect to</param>
        /// <returns>Boolean verifying that goToHost is on current host. </returns>
        public bool IsValidRedirectUri(string goToHost)
        {
            string validHost = generalSettings.GetHostName;
            int segments = generalSettings.GetHostName.Split('.').Length;

            List<string> goToList = Enumerable.Reverse(new List<string>(goToHost.Split('.'))).Take(segments).Reverse().ToList();
            string redirectHost = string.Join(".", goToList);

            return validHost.Equals(redirectHost);
        }

        /// <summary>
        /// Gets the organisation identifier of the org. Usually a 2-4 character short form of organisation name. Organisation numbers are updated if there is more than an hour since last harvest.
        /// </summary>
        /// <param name="organisationNumber">the organisation number as given in the central unit registry</param>
        /// <returns>the organisation identifier</returns>
        public string LookupOrg(string organisationNumber)
        {
            DateTime timestamp = DateTime.Now;
            timestamp = timestamp.AddHours(-1);

            if (dictionaryLastUpdated < timestamp || orgNumberToOrg.Count == 0)
            {
                HarvestOrgs();
            }

            return orgNumberToOrg.GetValueOrDefault(organisationNumber, null);            
        }

        /// <summary>
        /// Harvests organisations from valid altinn application owner lists. Updates a dictionary of organisationNumber -> org. 
        /// </summary>
        public void HarvestOrgs()
        {
            int countNew = 0;
            int countUpdated = 0;

            logger.LogInformation($"Authentication harvest of organisation from '{ALTINN_ORGS_LOCATION}' start.");

            try
            {                                
                HttpResponseMessage response = HttpClient.GetAsync(ALTINN_ORGS_LOCATION).Result;

                response.EnsureSuccessStatusCode();
                
                JObject orgs = JObject.Parse(response.Content.ReadAsStringAsync().Result);

                orgs = (JObject)orgs.GetValue("orgs");

                foreach (JToken prop in orgs.Children())
                {
                    JObject orgObject = (JObject)prop.Children().First();
                    string orgnr = orgObject["orgnr"].ToString();
                    string org = ((JProperty)prop).Name;

                    if (orgNumberToOrg.ContainsKey(orgnr))
                    {
                        if (!org.Equals(orgNumberToOrg[orgnr]))
                        {
                            orgNumberToOrg.Remove(orgnr);
                            orgNumberToOrg.Add(orgnr, org);
                            countUpdated++;
                        }
                    }
                    else
                    {
                        orgNumberToOrg.Add(orgnr, org);
                        countNew++;
                    }
                }

                dictionaryLastUpdated = DateTime.UtcNow;                                
            }
            catch (Exception ex)
            {
                logger.LogError($"Unable to harvest organisation data due to {ex}");
                if (orgNumberToOrg.Count > 0)
                {
                    logger.LogWarning($"Continuing with stale organisation cache. Cache now contains {orgNumberToOrg.Count} organisationNumber to org entries.");
                }
            }

            logger.LogInformation($"Authentication harvest of organisations finished. Resulting in {countNew} new and {countUpdated} organisations in cache.");
        }
    }
}
