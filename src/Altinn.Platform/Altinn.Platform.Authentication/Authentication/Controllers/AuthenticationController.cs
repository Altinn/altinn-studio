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
        private static Dictionary<string, string> orgNumberToOrg = new Dictionary<string, string>();
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
        public async Task<ActionResult> Get(string goTo)
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

            using (HttpClient client = new HttpClient())
            {
                logger.LogInformation($"Authentication - Before getting userdata");
                string userData = JsonConvert.SerializeObject(new UserAuthenticationModel() { EncryptedTicket = Request.Cookies[generalSettings.GetSBLCookieName] });
                logger.LogInformation($"Authentication - endpoint {endpointUrl}");
                HttpResponseMessage response = await client.PostAsync(endpointUrl, new StringContent(userData, Encoding.UTF8, "application/json"));
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
        }

        /// <summary>
        /// Refreshes JwtToken.
        /// </summary>
        /// <returns>Ok response with the refreshed token appended.</returns>
        [Authorize]
        [HttpGet("refresh")]
        public async Task<ActionResult> RefreshJWTCookie()
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
        public async Task<IActionResult> OrganisationAuthentication()
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

                logger.LogInformation($"Token to be validated{originalToken}");
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

                //// ToDo: Check claims and/or identity to authorize the request. It is not enough to have a valid token. There must be
                //// claims that confirms that the caller is an application owner.

                string consumerJson = originalPrincipal.FindFirstValue("consumer");
                JObject consumer = JObject.Parse(consumerJson);

                string consumerAuthority = consumer["Identifier"]["Authority"].ToString();
                string consumerID = consumer["Identifier"]["ID"].ToString();

                string organisationNumber = consumerID.Split(":")[1];

                List<Claim> claims = new List<Claim>();
                foreach (Claim claim in originalPrincipal.Claims)
                {
                    claims.Add(claim);
                }

                string org = LookupOrg(organisationNumber);

                claims.Add(new Claim("organsiationNumber", organisationNumber));
                claims.Add(new Claim("org", org));

                ClaimsIdentity identity = new ClaimsIdentity("OrgLogin");
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                string token = jwtHandler.GenerateToken(principal, new TimeSpan(0, Convert.ToInt32(generalSettings.GetJwtCookieValidityTime), 0));

                return Ok(token);
            }
            catch
            {
                return Unauthorized();
            }
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
        /// Gets the organisation identifier of the org. Usually a 2-4 character short form of organisation name. Organisation numbers are updated once every hour. But only on demand.
        /// </summary>
        /// <param name="organisationNumber">the organisation number as given in the central unit registry</param>
        /// <returns>the organisation identifier</returns>
        public static string LookupOrg(string organisationNumber)
        {
            DateTime timestamp = DateTime.Now;
            timestamp = timestamp.AddHours(-1);

            if (dictionaryLastUpdated < timestamp || orgNumberToOrg.Count == 0)
            {
                HarvestOrgs();
            }

            return orgNumberToOrg.GetValueOrDefault(organisationNumber, null);            
        }

        private static void HarvestOrgs()
        {
            using (HttpClient client = new HttpClient())
            {
                HttpResponseMessage response = client.GetAsync("https://altinncdn.no/orgs/altinn-orgs.json").Result;

                if (response.IsSuccessStatusCode)
                {
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
                            }                            
                        }
                        else
                        {
                            orgNumberToOrg.Add(orgnr, org);
                        }                       
                    }

                    dictionaryLastUpdated = DateTime.UtcNow;
                }
            }
        }
    }
}
