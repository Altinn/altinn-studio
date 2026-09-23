using System.Net.Http.Headers;
using System.Security.Claims;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.AccessManagement.Helpers;
using Altinn.App.Core.Internal.AccessManagement.Models;
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

    // The access lists are needed to leave out parties the user can only reach through delegated instances.
    private const string AuthorizedPartiesPathAndQuery =
        "/enduser/authorizedparties?includeRoles=true&includeAccessPackages=true&includeResources=true&includeInstances=true";
    private readonly string _authorizedPartiesUrl;
    private static readonly System.Text.Json.JsonSerializerOptions _authorizedPartiesJsonOptions = new(
        System.Text.Json.JsonSerializerDefaults.Web
    );

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
        _authorizedPartiesUrl =
            platformSettings.ApiAccessManagementEndpoint.TrimEnd('/') + AuthorizedPartiesPathAndQuery;
    }

    /// <inheritdoc />
    public async Task<List<Party>?> GetPartyList(
        int userId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartClientGetPartyListActivity(userId);
        JwtToken token = await GetAuthTokenResolver()
            .GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, cancellationToken);
        try
        {
            List<AuthorizedParty> authorizedParties = [];
            string? pageUrl = _authorizedPartiesUrl;
            while (pageUrl is not null)
            {
                using HttpResponseMessage response = await _client.GetAsync(
                    token,
                    pageUrl,
                    cancellationToken: cancellationToken
                );

                if (response.StatusCode != System.Net.HttpStatusCode.OK)
                {
                    _logger.LogError(
                        "Unable to retrieve party list. Access Management responded with status code {StatusCode}",
                        response.StatusCode
                    );
                    return null;
                }

                string responseData = await response.Content.ReadAsStringAsync(cancellationToken);
                var page = System.Text.Json.JsonSerializer.Deserialize<AuthorizedPartiesResponse>(
                    responseData,
                    _authorizedPartiesJsonOptions
                );
                authorizedParties.AddRange(page?.Data ?? []);

                string? nextPageUrl = page?.Links?.Next;
                pageUrl = nextPageUrl == pageUrl ? null : nextPageUrl;
            }

            return AuthorizedPartyMapper.ToParties(authorizedParties);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception e)
        {
            _logger.LogError("Unable to retrieve party list. An error occurred {ErrorMessage}", e.Message);
        }

        return null;
    }

    /// <inheritdoc />
    public async Task<bool?> ValidateSelectedParty(
        int userId,
        int partyId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartClientValidateSelectedPartyActivity(userId, partyId);
        List<Party>? parties = await GetPartyList(userId, authenticationMethod, cancellationToken);
        if (parties is null)
        {
            _logger.LogError(
                "Validating selected party {PartyId} for user {UserId} failed because the party list could not be retrieved",
                partyId,
                userId
            );
            return null;
        }

        return PartyListHelper.ContainsPartyWithAccess(parties, partyId);
    }

    /// <inheritdoc />
    public async Task<bool> AuthorizeAction(
        AppIdentifier appIdentifier,
        InstanceIdentifier instanceIdentifier,
        ClaimsPrincipal user,
        string action,
        string? taskId = null,
        CancellationToken cancellationToken = default
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
        XacmlJsonResponse response = await GetDecisionForRequest(request, cancellationToken);
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
        List<string> actions,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartClientAuthorizeActionsActivity(instance);
        XacmlJsonRequestRoot request = MultiDecisionHelper.CreateMultiDecisionRequest(user, instance, actions);
        XacmlJsonResponse response = await GetDecisionForRequest(request, cancellationToken);
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
    public async Task<List<string>> GetKeyRoleOrganizationParties(
        int userId,
        List<string> orgNumbers,
        CancellationToken cancellationToken = default
    )
    {
        XacmlJsonRequestRoot request = CreateXacmlJsonRequest(userId, orgNumbers);
        XacmlJsonResponse response = await GetDecisionForRequest(request, cancellationToken);

        if (response?.Response == null)
        {
            return [];
        }

        List<string> organizations =
        [
            .. response
                .Response.Where(result => result.Decision == "Permit")
                .SelectMany(result => result.Category)
                .SelectMany(category => category.Attribute)
                .Where(attribute => orgNumbers.Contains(attribute.Value))
                .Select(attribute => attribute.Value),
        ];

        return organizations;
    }

    /// <summary>
    /// <see cref="IPDP"/> (Altinn.Common.PEP) exposes no cancellation token, so cancellation can only be honored
    /// before the decision request is sent.
    /// </summary>
    private Task<XacmlJsonResponse> GetDecisionForRequest(
        XacmlJsonRequestRoot request,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        return _pdp.GetDecisionForRequest(request);
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
