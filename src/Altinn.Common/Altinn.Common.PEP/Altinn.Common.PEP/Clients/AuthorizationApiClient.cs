using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Common.PEP.Clients
{
    public class AuthorizationApiClient
    {
        private const string SubscriptionKeyHeaderName = "Ocp-Apim-Subscription-Key";
        private readonly HttpClient _httpClient;
        private readonly ILogger _logger;

        public AuthorizationApiClient(HttpClient client, IOptions<PlatformSettings> platformSettings, ILogger<AuthorizationApiClient> logger)
        {
            _httpClient = client;
            _logger = logger;
            client.BaseAddress = new Uri($"{platformSettings.Value.ApiAuthorizationEndpoint}");
            client.DefaultRequestHeaders.Add(SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task<XacmlJsonResponse> AuthorizeRequest(XacmlJsonRequestRoot xacmlJsonRequest)
        {
            XacmlJsonResponse xacmlJsonResponse = null;
            string apiUrl = $"decision";
            string requestJson = JsonConvert.SerializeObject(xacmlJsonRequest);
            StringContent httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");

            Stopwatch stopWatch = new Stopwatch();
            stopWatch.Start();
            HttpResponseMessage response = await _httpClient.PostAsync(apiUrl, httpContent);
            stopWatch.Stop();
            TimeSpan ts = stopWatch.Elapsed;
            _logger.LogInformation("Authorization PDP time elapsed: " + ts.TotalMilliseconds);

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string responseData = await response.Content.ReadAsStringAsync();
                xacmlJsonResponse = JsonConvert.DeserializeObject<XacmlJsonResponse>(responseData);
            }
            else
            {
                _logger.LogInformation($"// PDPAppSI // GetDecisionForRequest // Non-zero status code: {response.StatusCode}");
                _logger.LogInformation($"// PDPAppSI // GetDecisionForRequest // Response: {await response.Content.ReadAsStringAsync()}");
            }

            return xacmlJsonResponse;
        }
    }
}
