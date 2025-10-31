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
public class InstanceClient : IInstanceClient
{
    private readonly ILogger _logger;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly HttpClient _client;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="InstanceClient"/> class.
    /// </summary>
    /// <param name="platformSettings">the platform settings</param>
    /// <param name="logger">the logger</param>
    /// <param name="userTokenProvider">Get user token from httpContext</param>
    /// <param name="httpClient">A HttpClient that can be used to perform HTTP requests against the platform.</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public InstanceClient(
        IOptions<PlatformSettings> platformSettings,
        ILogger<InstanceClient> logger,
        IUserTokenProvider userTokenProvider,
        HttpClient httpClient,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _userTokenProvider = userTokenProvider;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        _client = httpClient;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<Instance> GetInstance(string app, string org, int instanceOwnerPartyId, Guid instanceId)
    {
        using var activity = _telemetry?.StartGetInstanceByGuidActivity(instanceId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceId}";

        string apiUrl = $"instances/{instanceIdentifier}";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            return instance;
        }
        else
        {
            _logger.LogError($"Unable to fetch instance with instance id {instanceId}");
            throw await PlatformHttpException.CreateAsync(response);
        }
    }

    /// <inheritdoc />
    public async Task<Instance> GetInstance(Instance instance)
    {
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        using var activity = _telemetry?.StartGetInstanceByInstanceActivity(instanceGuid);
        string app = instance.AppId.Split("/")[1];
        string org = instance.Org;
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);

        return await GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
    }

    /// <inheritdoc />
    public async Task<List<Instance>> GetInstances(Dictionary<string, StringValues> queryParams)
    {
        using var activity = _telemetry?.StartGetInstancesActivity();
        var apiUrl = QueryHelpers.AddQueryString("instances", queryParams);

        string token = _userTokenProvider.GetUserToken();
        QueryResponse<Instance> queryResponse = await QueryInstances(token, apiUrl);

        if (queryResponse.Count == 0)
        {
            return [];
        }
        List<Instance> instances = [.. queryResponse.Instances];

        while (!string.IsNullOrEmpty(queryResponse.Next))
        {
            queryResponse = await QueryInstances(token, queryResponse.Next);
            instances.AddRange(queryResponse.Instances);
        }
        return instances;
    }

    private async Task<QueryResponse<Instance>> QueryInstances(string token, string url)
    {
        using var activity = _telemetry?.StartQueryInstancesActivity();
        HttpResponseMessage response = await _client.GetAsync(token, url);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            QueryResponse<Instance> queryResponse = await JsonSerializerPermissive.DeserializeAsync<
                QueryResponse<Instance>
            >(response.Content);
            return queryResponse;
        }
        else
        {
            _logger.LogError("Unable to query instances from Platform Storage");
            throw await PlatformHttpException.CreateAsync(response);
        }
    }

    /// <inheritdoc />
    public async Task<Instance> UpdateProcess(Instance instance)
    {
        using var activity = _telemetry?.StartUpdateProcessActivity(instance);
        ProcessState processState = instance.Process;

        string apiUrl = $"instances/{instance.Id}/process";
        string token = _userTokenProvider.GetUserToken();

        string processStateString = JsonConvert.SerializeObject(processState);
        _logger.LogInformation($"update process state: {processStateString}");

        StringContent httpContent = new(processStateString, Encoding.UTF8, "application/json");
        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, httpContent);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance updatedInstance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            return updatedInstance;
        }
        else
        {
            _logger.LogError($"Unable to update instance process with instance id {instance.Id}");
            throw await PlatformHttpException.CreateAsync(response);
        }
    }

    /// <inheritdoc />
    public async Task<Instance> UpdateProcessAndEvents(Instance instance, List<InstanceEvent> events)
    {
        using var activity = _telemetry?.StartUpdateProcessActivity(instance, events.Count);
        ProcessState processState = instance.Process;

        foreach (var instanceEvent in events)
            instanceEvent.InstanceId = instance.Id;

        string apiUrl = $"instances/{instance.Id}/process/instanceandevents";
        string token = _userTokenProvider.GetUserToken();

        var update = new ProcessStateUpdate { State = processState, Events = events };
        string updateString = JsonConvert.SerializeObject(update);
        _logger.LogInformation($"update process state: {updateString}");

        StringContent httpContent = new(updateString, Encoding.UTF8, "application/json");
        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, httpContent);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance updatedInstance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            return updatedInstance;
        }
        else
        {
            _logger.LogError($"Unable to update instance process with instance id {instance.Id}");
            throw await PlatformHttpException.CreateAsync(response);
        }
    }

    /// <inheritdoc/>
    public async Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
    {
        using var activity = _telemetry?.StartCreateInstanceActivity();
        string apiUrl = $"instances?appId={org}/{app}";
        string token = _userTokenProvider.GetUserToken();

        StringContent content = new(JsonConvert.SerializeObject(instanceTemplate), Encoding.UTF8, "application/json");
        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content);

        if (response.IsSuccessStatusCode)
        {
            Instance createdInstance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            _telemetry?.InstanceCreated(createdInstance);
            return createdInstance;
        }

        _logger.LogError(
            $"Unable to create instance {response.StatusCode} - {await response.Content.ReadAsStringAsync()}"
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc/>
    public async Task<Instance> AddCompleteConfirmation(int instanceOwnerPartyId, Guid instanceGuid)
    {
        using var activity = _telemetry?.StartCompleteConfirmationActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/complete";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, new StringContent(string.Empty));

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            _telemetry?.InstanceCompleted(instance);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc/>
    public async Task<Instance> UpdateReadStatus(int instanceOwnerPartyId, Guid instanceGuid, string readStatus)
    {
        using var activity = _telemetry?.StartUpdateReadStatusActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/readstatus?status={readStatus}";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, new StringContent(string.Empty));

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
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
    public async Task<Instance> UpdateSubstatus(int instanceOwnerPartyId, Guid instanceGuid, Substatus substatus)
    {
        using var activity = _telemetry?.StartUpdateSubStatusActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/substatus";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            new StringContent(JsonConvert.SerializeObject(substatus), Encoding.UTF8, "application/json")
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<Instance> UpdatePresentationTexts(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        PresentationTexts presentationTexts
    )
    {
        using var activity = _telemetry?.StartUpdatePresentationTextActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/presentationtexts";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            new StringContent(JsonConvert.SerializeObject(presentationTexts), Encoding.UTF8, "application/json")
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<Instance> UpdateDataValues(int instanceOwnerPartyId, Guid instanceGuid, DataValues dataValues)
    {
        using var activity = _telemetry?.StartUpdateDataValuesActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/datavalues";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            new StringContent(JsonConvert.SerializeObject(dataValues), Encoding.UTF8, "application/json")
        );

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<Instance> DeleteInstance(int instanceOwnerPartyId, Guid instanceGuid, bool hard)
    {
        using var activity = _telemetry?.StartDeleteInstanceActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}?hard={hard}";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.DeleteAsync(token, apiUrl);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Instance instance = await JsonSerializerPermissive.DeserializeAsync<Instance>(response.Content);
            _telemetry?.InstanceDeleted(instance);
            return instance;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }
}
