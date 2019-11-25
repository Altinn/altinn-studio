using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Clients;
using Altinn.Common.PEP.Interfaces;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Common.PEP.Implementation
{
    /// <summary>
    /// App implementation of the authorization service where the app uses the Altinn platform api.
    /// </summary>
    public class PDPAppSI : IPDP
    {
        private readonly HttpClient _authClient;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationAppSI"/> class
        /// </summary>
        /// <param name="httpClientAccessor">The Http client accessor</param>
        /// <param name="logger">the handler for logger service</param>
        public PDPAppSI(
                IHttpClientAccessor httpClientAccessor,
                ILogger<PDPAppSI> logger)
        {
            _authClient = httpClientAccessor.AuthorizationClient;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequest xacmlJsonRequest)
        {
            XacmlJsonResponse xacmlJsonResponse = null;
            string apiUrl = $"decision";

            try
            {
                string requestJson = JsonConvert.SerializeObject(xacmlJsonRequest);
                StringContent httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");
                HttpResponseMessage response = _authClient.PostAsync(apiUrl, httpContent).Result;

                if (response.StatusCode == HttpStatusCode.OK)
                {
                    string responseData = response.Content.ReadAsStringAsync().Result;
                    xacmlJsonResponse = JsonConvert.DeserializeObject<XacmlJsonResponse>(responseData);
                }
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to retrieve Xacml Json response. An error occured {e.Message}");
            }

            return xacmlJsonResponse;
        }

        /// <inheritdoc/>
        public async Task<bool> GetDecisionForUnvalidateRequest(XacmlJsonRequest xacmlJsonRequest, ClaimsPrincipal user)
        {
            XacmlJsonResponse response = await GetDecisionForRequest(xacmlJsonRequest);

            if (response == null || response.Response == null)
            {
                return false; ;
            }

            List<XacmlJsonResult> results = response.Response;

            // We request one thing and then only want one result
            if (results.Count != 1)
            {
                return false;
            }

            // Checks that the result is nothing else than "permit"
            if (!results.First().Decision.Equals(XacmlContextDecision.Permit.ToString()))
            {
                // Burde man fortelle hva slags status resultatet i så fall har?
                return false;
            }

            // Checks if the result contains obligation
            if (results.First().Obligations != null && results.Count > 0)
            {
                List<XacmlJsonObligationOrAdvice> obligationList = results.First().Obligations;
                XacmlJsonAttributeAssignment attributeMinLvAuth = obligationList.Select(a => a.AttributeAssignment.Find(a => a.Category.Equals("urn:altinn:minimum-authenticationlevel"))).FirstOrDefault();

                // Checks if the obligation contains a minimum authentication level attribute
                if (attributeMinLvAuth != null)
                {
                    string minAuthenticationLevel = attributeMinLvAuth.Value;
                    string usersAuthenticationLevel = user.Claims.FirstOrDefault(c => c.Type.Equals("urn:altinn:minimum-authenticationlevel")).Value;

                    // Checks that the user meets the minimum authentication level
                    if (Convert.ToInt32(usersAuthenticationLevel) < Convert.ToInt32(minAuthenticationLevel))
                    {
                        return false;
                    }
                }
            }

            return true;
        }
    }
}
