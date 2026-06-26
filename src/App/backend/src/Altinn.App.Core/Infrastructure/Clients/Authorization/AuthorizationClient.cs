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
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Authorization;

/// <summary>
/// Client for handling authorization actions in Altinn Platform.
/// </summary>
public class AuthorizationClient : IAuthorizationClient
{
    private readonly HttpClient _client;
    private readonly IServiceProvider _serviceProvider;
    private readonly IPDP _pdp;
    private readonly ILogger _logger;
    private readonly Telemetry? _telemetry;
    private const string ForwardedForHeaderName = "x-forwarded-for";

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    // Resolved lazily to avoid circular dependency:
    // AuthorizationClient → IAuthenticationTokenResolver → AuthenticationContext → IAuthorizationClient
    private IAuthenticationTokenResolver? _authTokenResolver;

    private IAuthenticationTokenResolver GetAuthTokenResolver() =>
        _authTokenResolver ??= _serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthorizationClient"/> class
    /// </summary>
    /// <param name="httpClient">A Http client from the HttpClientFactory.</param>
    /// <param name="serviceProvider">The service provider.</param>
    public AuthorizationClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _pdp = serviceProvider.GetRequiredService<IPDP>();
        _logger = serviceProvider.GetRequiredService<ILogger<AuthorizationClient>>();
        _telemetry = serviceProvider.GetService<Telemetry>();

        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;
        httpClient.BaseAddress = new Uri(platformSettings.ApiAuthorizationEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
    }

    /// <inheritdoc />
    public async Task<List<Party>?> GetPartyList(int userId, StorageAuthenticationMethod? authenticationMethod = null)
    {
        using var activity = _telemetry?.StartClientGetPartyListActivity(userId);
        List<Party>? partyList = null;
        string apiUrl = $"parties?userid={userId}";
        JwtToken token = await GetAuthTokenResolver()
            .GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod);
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
            _logger.LogError("Unable to retrieve party list. An error occurred {ErrorMessage}", e.Message);
        }

        return partyList;
    }

    /// <inheritdoc />
    public async Task<bool?> ValidateSelectedParty(
        int userId,
        int partyId,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        using var activity = _telemetry?.StartClientValidateSelectedPartyActivity(userId, partyId);
        bool? result;
        string apiUrl = $"parties/{partyId}/validate?userid={userId}";
        JwtToken token = await GetAuthTokenResolver()
            .GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod);

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

        if (response.StatusCode == System.Net.HttpStatusCode.OK)
        {
            string responseData = await response.Content.ReadAsStringAsync();
            result = JsonConvert.DeserializeObject<bool>(responseData);
        }
        else
        {
            _logger.LogError(
                "Validating selected party {PartyId} for user {UserId} failed with statuscode {StatusCode}",
                partyId,
                userId,
                response.StatusCode
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

        ArgumentException.ThrowIfNullOrWhiteSpace(action, nameof(action));

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

    /// <inheritdoc />
    public async Task<List<string>> GetKeyRoleOrganizationParties(int userId, List<string> orgNumbers)
    {
        XacmlJsonRequestRoot request = CreateXacmlJsonRequest(userId, orgNumbers);
        XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

        if (response?.Response == null)
        {
            return [];
        }

        List<string> organisations =
        [
            .. response
                .Response.Where(result => result.Decision == "Permit")
                .SelectMany(result => result.Category)
                .SelectMany(category => category.Attribute)
                .Where(attribute => orgNumbers.Contains(attribute.Value))
                .Select(attribute => attribute.Value),
        ];

        return organisations;
    }

    private static XacmlJsonRequestRoot CreateXacmlJsonRequest(int userId, List<string> orgNumbers)
    {
        string accessSubjectId = "s1";
        string actionId = "a1";

        List<XacmlJsonCategory> orgCategories = [];
        List<XacmlJsonRequestReference> requestReferences = [];

        foreach (var orgNumber in orgNumbers)
        {
            orgCategories.Add(CreateXacmlCategoryForOrg(orgNumbers, orgNumber));
            requestReferences.Add(CreateRequestReference(orgNumbers, accessSubjectId, actionId, orgNumber));
        }
        return new()
        {
            Request = new XacmlJsonRequest()
            {
                ReturnPolicyIdList = true,
                AccessSubject =
                [
                    new XacmlJsonCategory()
                    {
                        Id = accessSubjectId,
                        Attribute =
                        [
                            new XacmlJsonAttribute()
                            {
                                AttributeId = "urn:altinn:userid",
                                Value = userId.ToString(System.Globalization.CultureInfo.InvariantCulture),
                            },
                        ],
                    },
                ],
                Action =
                [
                    new XacmlJsonCategory()
                    {
                        Id = actionId,
                        Attribute =
                        [
                            new XacmlJsonAttribute()
                            {
                                AttributeId = "urn:oasis:names:tc:xacml:1.0:action:action-id",
                                Value = "access",
                                DataType = "http://www.w3.org/2001/XMLSchema#string",
                                IncludeInResult = false,
                            },
                        ],
                    },
                ],
                Resource = orgCategories,
                MultiRequests = new XacmlJsonMultiRequests() { RequestReference = requestReferences },
            },
        };
    }

    private static XacmlJsonRequestReference CreateRequestReference(
        List<string> orgNumbers,
        string accessSubjectId,
        string actionId,
        string orgNumber
    )
    {
        return new XacmlJsonRequestReference()
        {
            ReferenceId = [accessSubjectId, actionId, "r" + orgNumbers.IndexOf(orgNumber)],
        };
    }

    private static XacmlJsonCategory CreateXacmlCategoryForOrg(List<string> orgNumbers, string orgNumber)
    {
        return new XacmlJsonCategory()
        {
            Id = "r" + orgNumbers.IndexOf(orgNumber),
            Attribute =
            [
                new XacmlJsonAttribute()
                {
                    AttributeId = "urn:altinn:resource",
                    Value = "altinn_keyrole_access",
                    DataType = "http://www.w3.org/2001/XMLSchema#string",
                },
                new XacmlJsonAttribute()
                {
                    AttributeId = "urn:altinn:organization:identifier-no",
                    Value = orgNumber,
                    DataType = "http://www.w3.org/2001/XMLSchema#string",
                    IncludeInResult = true,
                },
            ],
        };
    }
}
