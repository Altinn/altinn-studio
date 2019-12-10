using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Clients;
using Altinn.Common.PEP.Configuration;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
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
        private readonly PepSettings _pepSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationAppSI"/> class
        /// </summary>
        /// <param name="httpClientAccessor">The Http client accessor</param>
        /// <param name="logger">the handler for logger service</param>
        /// /// <param name="pepSettings">The settings for pep</param>
        public PDPAppSI(
                IHttpClientAccessor httpClientAccessor,
                ILogger<PDPAppSI> logger,
                IOptions<PepSettings> pepSettings)
        {
            _authClient = httpClientAccessor.AuthorizationClient;
            _logger = logger;
            _pepSettings = pepSettings.Value;
        }

        /// <inheritdoc/>
        public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequestRoot xacmlJsonRequest)
        {
            XacmlJsonResponse xacmlJsonResponse = null;
            string apiUrl = $"decision";

            try
            {
                string requestJson = JsonConvert.SerializeObject(xacmlJsonRequest);
                StringContent httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");
                _authClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
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
        public async Task<bool> GetDecisionForUnvalidateRequest(XacmlJsonRequestRoot xacmlJsonRequest, ClaimsPrincipal user)
        {
            if (_pepSettings.DisablePEP)
            {
                return true;
            }

            XacmlJsonResponse response = await GetDecisionForRequest(xacmlJsonRequest);

            _logger.LogInformation($"// Altinn PEP // PDPAppSI // Request sent to platform authorization: {JsonConvert.SerializeObject(xacmlJsonRequest)}");

            return DecisionHelper.ValidateResponse(response.Response, user);
        }
    }
}
