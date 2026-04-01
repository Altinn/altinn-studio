using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// A client for handling actions on instances in Altinn Platform.
/// </summary>
internal sealed class InstanceClient : IInstanceClient
{
    private readonly ILogger _logger;
    private readonly IAuthenticationTokenResolver _tokenResolver;
    private readonly HttpClient _client;
    private readonly Telemetry? _telemetry;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    /// <summary>
    /// Initializes a new instance of the <see cref="InstanceClient"/> class.
    /// </summary>
    /// <param name="platformSettings">the platform settings</param>
    /// <param name="logger">the logger</param>
    /// <param name="tokenResolver">Get user token from httpContext</param>
    /// <param name="httpClient">A HttpClient that can be used to perform HTTP requests against the platform.</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public InstanceClient(
        IOptions<PlatformSettings> platformSettings,
        ILogger<InstanceClient> logger,
        IAuthenticationTokenResolver tokenResolver,
        HttpClient httpClient,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _tokenResolver = tokenResolver;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        _client = httpClient;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<Instance> GetInstance(
        string app,
        string org,
        int instanceOwnerPartyId,
        Guid instanceId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartGetInstanceByGuidActivity(instanceId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceId}";

        string apiUrl = $"instances/{instanceIdentifier}";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        using HttpResponseMessage response = await _client.GetAsync(token, apiUrl, cancellationToken: ct);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            return instance;
        }
        else
        {
            _logger.LogError($"Unable to fetch instance with instance id {instanceId}");
            throw await PlatformHttpException.CreateAsync(response);
        }
    }

    /// <inheritdoc />
    public async Task<Instance> GetInstance(
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        using var activity = _telemetry?.StartGetInstanceByInstanceActivity(instanceGuid);
        string app = instance.AppId.Split("/")[1];
        string org = instance.Org;
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);

        return await GetInstance(app, org, instanceOwnerPartyId, instanceGuid, authenticationMethod, ct);
    }

    /// <inheritdoc />
    public async Task<List<Instance>> GetInstances(
        Dictionary<string, StringValues> queryParams,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartGetInstancesActivity();
        var apiUrl = QueryHelpers.AddQueryString("instances", queryParams);

        QueryResponse<Instance> queryResponse = await QueryInstances(apiUrl, authenticationMethod, ct);

        if (queryResponse.Count == 0)
        {
            return [];
        }
        List<Instance> instances = [.. queryResponse.Instances];

        while (!string.IsNullOrEmpty(queryResponse.Next))
        {
            queryResponse = await QueryInstances(queryResponse.Next, authenticationMethod, ct);
            instances.AddRange(queryResponse.Instances);
        }
        return instances;
    }

    private async Task<QueryResponse<Instance>> QueryInstances(
        string url,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);
        using var activity = _telemetry?.StartQueryInstancesActivity();
        HttpResponseMessage response = await _client.GetAsync(token, url, cancellationToken: ct);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            QueryResponse<Instance> queryResponse = await JsonSerializerPermissive.DeserializeAsync<
                QueryResponse<Instance>
            >(response.Content, ct);
            return queryResponse;
        }
        else
        {
            _logger.LogError("Unable to query instances from Platform Storage");
            throw await PlatformHttpException.CreateAsync(response);
        }
    }

    /// <inheritdoc />
    public async Task<Instance> UpdateProcess(
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartUpdateProcessActivity(instance);
        ProcessState processState = instance.Process;

        string apiUrl = $"instances/{instance.Id}/process";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        string processStateString = JsonConvert.SerializeObject(processState);
        _logger.LogInformation($"update process state: {processStateString}");

        StringContent httpContent = new(processStateString, Encoding.UTF8, "application/json");
        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, httpContent, cancellationToken: ct);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance updatedInstance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            return updatedInstance;
        }
        else
        {
            _logger.LogError($"Unable to update instance process with instance id {instance.Id}");
            throw await PlatformHttpException.CreateAsync(response);
        }
    }

    /// <inheritdoc />
    public async Task<Instance> UpdateProcessAndEvents(
        Instance instance,
        List<InstanceEvent> events,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartUpdateProcessActivity(instance, events.Count);
        ProcessState processState = instance.Process;

        foreach (var instanceEvent in events)
            instanceEvent.InstanceId = instance.Id;

        string apiUrl = $"instances/{instance.Id}/process/instanceandevents";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        var update = new ProcessStateUpdate { State = processState, Events = events };
        string updateString = JsonConvert.SerializeObject(update);
        _logger.LogInformation($"update process state: {updateString}");

        StringContent httpContent = new(updateString, Encoding.UTF8, "application/json");
        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, httpContent, cancellationToken: ct);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance updatedInstance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            return updatedInstance;
        }
        else
        {
            _logger.LogError($"Unable to update instance process with instance id {instance.Id}");
            throw await PlatformHttpException.CreateAsync(response);
        }
    }

    /// <inheritdoc/>
    public async Task<Instance> CreateInstance(
        string org,
        string app,
        Instance instanceTemplate,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartCreateInstanceActivity();
        string apiUrl = $"instances?appId={org}/{app}";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        StringContent content = new(JsonConvert.SerializeObject(instanceTemplate), Encoding.UTF8, "application/json");
        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content, cancellationToken: ct);

        if (response.IsSuccessStatusCode)
        {
            Instance createdInstance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            _telemetry?.InstanceCreated(createdInstance);
            return createdInstance;
        }

        _logger.LogError(
            $"Unable to create instance {response.StatusCode} - {await response.Content.ReadAsStringAsync(CancellationToken.None)}"
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc/>
    public async Task<Instance> AddCompleteConfirmation(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartCompleteConfirmationActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/complete";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        HttpResponseMessage response = await _client.PostAsync(
            token,
            apiUrl,
            new StringContent(string.Empty),
            cancellationToken: ct
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            _telemetry?.InstanceCompleted(instance);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc/>
    public async Task<Instance> UpdateReadStatus(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string readStatus,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartUpdateReadStatusActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/readstatus?status={readStatus}";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            new StringContent(string.Empty),
            cancellationToken: ct
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            return instance;
        }

        _logger.LogError(
            $"Could not update read status for instance {instanceOwnerPartyId}/{instanceGuid}. Request failed with status code {response.StatusCode}"
        );
#nullable disable
        return null;
#nullable restore
    }

    /// <inheritdoc/>
    public async Task<Instance> UpdateSubstatus(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Substatus substatus,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartUpdateSubStatusActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/substatus";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            new StringContent(JsonConvert.SerializeObject(substatus), Encoding.UTF8, "application/json"),
            cancellationToken: ct
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<Instance> UpdatePresentationTexts(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        PresentationTexts presentationTexts,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartUpdatePresentationTextActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/presentationtexts";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            new StringContent(JsonConvert.SerializeObject(presentationTexts), Encoding.UTF8, "application/json"),
            cancellationToken: ct
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<Instance> UpdateDataValues(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        DataValues dataValues,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartUpdateDataValuesActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/datavalues";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);

        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            new StringContent(JsonConvert.SerializeObject(dataValues), Encoding.UTF8, "application/json"),
            cancellationToken: ct
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<Instance> DeleteInstance(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        bool hard,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartDeleteInstanceActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}?hard={hard}";
        string token = await _tokenResolver.GetAccessToken(authenticationMethod ?? _defaultAuthenticationMethod, ct);
        HttpResponseMessage response = await _client.DeleteAsync(token, apiUrl, cancellationToken: ct);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content, ct);
            _telemetry?.InstanceDeleted(instance);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }
}
