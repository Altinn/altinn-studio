using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Events;

/// <summary>
/// A client for handling actions on events in Altinn Platform.
/// </summary>
public class EventsClient : IEventsClient
{
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;
    private readonly GeneralSettings _generalSettings;
    private readonly HttpClient _client;
    private readonly Telemetry? _telemetry;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly IAppMetadata _appMetadata;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    /// <summary>
    /// Initializes a new instance of the <see cref="EventsClient"/> class.
    /// </summary>
    /// <param name="httpClient">A HttpClient from the built-in HttpClient factory.</param>
    /// <param name="serviceProvider">The service provider.</param>
    public EventsClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        _authenticationTokenResolver = serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();
        _appMetadata = serviceProvider.GetRequiredService<IAppMetadata>();
        _accessTokenGenerator = serviceProvider.GetRequiredService<IAccessTokenGenerator>();
        _telemetry = serviceProvider.GetService<Telemetry>();

        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;
        _generalSettings = serviceProvider.GetRequiredService<IOptions<GeneralSettings>>().Value;

        httpClient.BaseAddress = new Uri(platformSettings.ApiEventsEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
    }

    /// <inheritdoc/>
    public async Task<string> AddEvent(
        string eventType,
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        using var activity = _telemetry?.StartAddEventActivity(instance);
        string? alternativeSubject = null;
        if (!string.IsNullOrWhiteSpace(instance.InstanceOwner.OrganisationNumber))
        {
            alternativeSubject = $"/org/{instance.InstanceOwner.OrganisationNumber}";
        }
        else if (!string.IsNullOrWhiteSpace(instance.InstanceOwner.PersonNumber))
        {
            alternativeSubject = $"/person/{instance.InstanceOwner.PersonNumber}";
        }
        else if (!string.IsNullOrWhiteSpace(instance.InstanceOwner.ExternalIdentifier))
        {
            alternativeSubject = instance.InstanceOwner.ExternalIdentifier;
        }

        var baseUrl = _generalSettings.FormattedExternalAppBaseUrl(new AppIdentifier(instance));

        CloudEvent cloudEvent = new CloudEvent
        {
            Subject = $"/party/{instance.InstanceOwner.PartyId}",
            Type = eventType,
            AlternativeSubject = alternativeSubject,
            Time = DateTime.UtcNow,
            SpecVersion = "1.0",
            Source = new Uri($"{baseUrl}instances/{instance.Id}"),
        };
        Application app = await _appMetadata.GetApplicationMetadata();
        string accessToken = _accessTokenGenerator.GenerateAccessToken(app?.Org, app?.Id.Split("/")[1]);

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod
        );

        string serializedCloudEvent = JsonSerializer.Serialize(cloudEvent);

        HttpResponseMessage response = await _client.PostAsync(
            token,
            "app",
            new StringContent(serializedCloudEvent, Encoding.UTF8, "application/json"),
            accessToken
        );

        if (response.IsSuccessStatusCode)
        {
            string eventId = await response.Content.ReadAsStringAsync();
            return eventId;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }
}
