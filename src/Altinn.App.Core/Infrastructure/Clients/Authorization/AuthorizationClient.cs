using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Authorization
{
    /// <summary>
    /// Client for handling authorization actions in Altinn Platform.
    /// </summary>
    public class AuthorizationClient : IAuthorizationClient
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppSettings _settings;
        private readonly HttpClient _client;
        private readonly IPDP _pdp;
        private readonly ILogger _logger;
        private readonly Telemetry? _telemetry;
        private const string ForwardedForHeaderName = "x-forwarded-for";

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationClient"/> class
        /// </summary>
        /// <param name="platformSettings">The platform settings from configuration.</param>
        /// <param name="httpContextAccessor">the http context accessor.</param>
        /// <param name="httpClient">A Http client from the HttpClientFactory.</param>
        /// <param name="settings">The application settings.</param>
        /// <param name="pdp"></param>
        /// <param name="logger">the handler for logger service</param>
        /// <param name="telemetry">Telemetry for traces and metrics.</param>
        public AuthorizationClient(
            IOptions<PlatformSettings> platformSettings,
            IHttpContextAccessor httpContextAccessor,
            HttpClient httpClient,
            IOptionsMonitor<AppSettings> settings,
            IPDP pdp,
            ILogger<AuthorizationClient> logger,
            Telemetry? telemetry = null
        )
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.CurrentValue;
            _pdp = pdp;
            _logger = logger;
            _telemetry = telemetry;
            httpClient.BaseAddress = new Uri(platformSettings.Value.ApiAuthorizationEndpoint);

            if (!httpClient.DefaultRequestHeaders.Contains(ForwardedForHeaderName))
            {
                string? clientIpAddress = _httpContextAccessor.HttpContext?.Request?.Headers?[ForwardedForHeaderName];
                httpClient.DefaultRequestHeaders.Add(ForwardedForHeaderName, clientIpAddress);
            }
            httpClient.DefaultRequestHeaders.Add(
                General.SubscriptionKeyHeaderName,
                platformSettings.Value.SubscriptionKey
            );
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client = httpClient;
        }

        /// <inheritdoc />
        public async Task<List<Party>?> GetPartyList(int userId)
        {
            using var activity = _telemetry?.StartClientGetPartyListActivity(userId);
            List<Party>? partyList = null;
            string apiUrl = $"parties?userid={userId}";
            string token = JwtTokenUtil.GetTokenFromContext(
                _httpContextAccessor.HttpContext,
                _settings.RuntimeCookieName
            );
            try
            {
                HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string partyListData = await response.Content.ReadAsStringAsync();
                    partyList = JsonConvert.DeserializeObject<List<Party>>(partyListData);
                }
            }
            catch (Exception e)
            {
                _logger.LogError($"Unable to retrieve party list. An error occured {e.Message}");
            }

            return partyList;
        }

        /// <inheritdoc />
        public async Task<bool?> ValidateSelectedParty(int userId, int partyId)
        {
            using var activity = _telemetry?.StartClientValidateSelectedPartyActivity(userId, partyId);
            bool? result;
            string apiUrl = $"parties/{partyId}/validate?userid={userId}";
            string token = JwtTokenUtil.GetTokenFromContext(
                _httpContextAccessor.HttpContext,
                _settings.RuntimeCookieName
            );

            HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                string responseData = await response.Content.ReadAsStringAsync();
                result = JsonConvert.DeserializeObject<bool>(responseData);
            }
            else
            {
                _logger.LogError(
                    $"Validating selected party {partyId} for user {userId} failed with statuscode {response.StatusCode}"
                );
                result = null;
            }

            return result;
        }

        /// <inheritdoc />
        public async Task<bool> AuthorizeAction(
            AppIdentifier appIdentifier,
            InstanceIdentifier instanceIdentifier,
            ClaimsPrincipal user,
            string action,
            string? taskId = null
        )
        {
            using var activity = _telemetry?.StartClientAuthorizeActionActivity(instanceIdentifier, action, taskId);
            XacmlJsonRequestRoot request = DecisionHelper.CreateDecisionRequest(
                appIdentifier.Org,
                appIdentifier.App,
                user,
                action,
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                taskId
            );
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);
            if (response?.Response == null)
            {
                _logger.LogWarning(
                    "Failed to get decision from pdp: {SerializeObject}",
                    JsonConvert.SerializeObject(request)
                );
                return false;
            }

            bool authorized = DecisionHelper.ValidatePdpDecision(response.Response, user);
            return authorized;
        }

        /// <inheritdoc />
        public async Task<Dictionary<string, bool>> AuthorizeActions(
            Instance instance,
            ClaimsPrincipal user,
            List<string> actions
        )
        {
            using var activity = _telemetry?.StartClientAuthorizeActionsActivity(instance);
            XacmlJsonRequestRoot request = MultiDecisionHelper.CreateMultiDecisionRequest(user, instance, actions);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);
            if (response?.Response == null)
            {
                _logger.LogWarning(
                    "Failed to get decision from pdp: {SerializeObject}",
                    JsonConvert.SerializeObject(request)
                );
                return new Dictionary<string, bool>();
            }
            Dictionary<string, bool> actionsResult = new Dictionary<string, bool>();
            foreach (var action in actions)
            {
                actionsResult.Add(action, false);
            }
            return MultiDecisionHelper.ValidatePdpMultiDecision(actionsResult, response.Response, user);
        }
    }
}
