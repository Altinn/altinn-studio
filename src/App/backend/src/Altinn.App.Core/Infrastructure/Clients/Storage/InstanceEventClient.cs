using System.Diagnostics;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// A client for handling actions on instance events in Altinn Platform.
/// </summary>
public class InstanceEventClient : IInstanceEventClient
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AppSettings _settings;
    private readonly HttpClient _client;

    /// <summary>
    /// Initializes a new instance of the <see cref="InstanceEventClient"/> class.
    /// </summary>
    /// <param name="platformSettings">the platform settings</param>
    /// <param name="httpContextAccessor">The http context accessor </param>
    /// <param name="httpClient">The Http client</param>
    /// <param name="settings">The application settings.</param>
    public InstanceEventClient(
        IOptions<PlatformSettings> platformSettings,
        IHttpContextAccessor httpContextAccessor,
        HttpClient httpClient,
        IOptionsMonitor<AppSettings> settings
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _settings = settings.CurrentValue;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        _client = httpClient;
    }

    /// <inheritdoc/>
    public async Task<List<InstanceEvent>> GetInstanceEvents(
        string instanceId,
        string instanceOwnerPartyId,
        string org,
        string app,
        string[] eventTypes,
        string from,
        string to
    )
    {
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceId}/events";
        string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

        char paramSeparator = '?';
        if (eventTypes != null)
        {
            StringBuilder bld = new StringBuilder();
            foreach (string type in eventTypes)
            {
                bld.Append(CultureInfo.InvariantCulture, $"{paramSeparator}eventTypes={type}");
                paramSeparator = '&';
            }

            apiUrl += bld.ToString();
        }

        if (!(string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to)))
        {
            apiUrl += $"{paramSeparator}from={from}&to={to}";
        }

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

        if (response.IsSuccessStatusCode)
        {
            string eventData = await response.Content.ReadAsStringAsync();
            InstanceEventList instanceEvents =
                JsonConvert.DeserializeObject<InstanceEventList>(eventData)
                ?? throw new JsonException("Could not deserialize InstanceEventList");

            return instanceEvents.InstanceEvents;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc/>
    public async Task<string> SaveInstanceEvent(object dataToSerialize, string org, string app)
    {
        InstanceEvent instanceEvent = (InstanceEvent)dataToSerialize;
        instanceEvent.Created = DateTime.UtcNow;
        string apiUrl = $"instances/{instanceEvent.InstanceId}/events";
        string token = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _settings.RuntimeCookieName);

        HttpResponseMessage response = await _client.PostAsync(
            token,
            apiUrl,
            new StringContent(instanceEvent.ToString(), Encoding.UTF8, "application/json")
        );

        if (response.IsSuccessStatusCode)
        {
            string eventData = await response.Content.ReadAsStringAsync();
            InstanceEvent result =
                JsonConvert.DeserializeObject<InstanceEvent>(eventData)
                ?? throw new Exception("Failed to deserialize instance event");
            var id = result.Id.ToString();
            Debug.Assert(id is not null, "Nullable<Guid>.ToString() never returns null");
            // ^ https://github.com/dotnet/runtime/blob/9b088ab8287a77c52ff7c4ed6fa96be6d3eb87f1/src/libraries/System.Private.CoreLib/src/System/Nullable.cs#L67
            // ^ https://github.com/dotnet/runtime/blob/9b088ab8287a77c52ff7c4ed6fa96be6d3eb87f1/src/libraries/System.Private.CoreLib/src/System/Guid.cs#L1124
            return id;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }
}
