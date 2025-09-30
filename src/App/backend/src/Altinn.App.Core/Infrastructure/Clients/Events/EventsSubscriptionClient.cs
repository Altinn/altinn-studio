using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Events;

/// <summary>
/// A client for handling actions on events in Altinn Platform.
/// </summary>
public class EventsSubscriptionClient : IEventsSubscription
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly GeneralSettings _generalSettings;
    private readonly HttpClient _client;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<EventsSubscriptionClient> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="EventsClient"/> class.
    /// </summary>
    public EventsSubscriptionClient(
        IOptions<PlatformSettings> platformSettings,
        HttpClient httpClient,
        IOptions<GeneralSettings> generalSettings,
        IServiceProvider serviceProvider,
        ILogger<EventsSubscriptionClient> logger
    )
    {
        _generalSettings = generalSettings.Value;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiEventsEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _logger = logger;
    }

    /// <summary>
    /// Creates a subscription on behalf of the org/app for the specified event type.
    /// </summary>
    /// <param name="org">The organization subscribing to the event.</param>
    /// <param name="app">The application the subscription should be deliverd to, will be combinded with org.</param>
    /// <param name="eventType">The event type to subscribe to.
    /// Source filter will be automatially added, and set to the url of the application.</param>
    /// <returns>The created <see cref="Subscription"/></returns>
    public async Task<Subscription> AddSubscription(string org, string app, string eventType)
    {
        var appBaseUrl = _generalSettings.FormattedExternalAppBaseUrl(new Models.AppIdentifier(org, app));

        var secretCodeProvider = _appImplementationFactory.GetRequired<IEventSecretCodeProvider>();
        var subscriptionRequest = new SubscriptionRequest()
        {
            TypeFilter = eventType,
            EndPoint = new Uri($"{appBaseUrl}api/v1/eventsreceiver?code={await secretCodeProvider.GetSecretCode()}"),
            SourceFilter = new Uri(appBaseUrl.TrimEnd('/')), // The event system is requireing the source filter to be without trailing slash
        };

        string serializedSubscriptionRequest = JsonSerializer.Serialize(subscriptionRequest);

        _logger.LogInformation(
            "About to send the following subscription request {subscriptionJson}",
            serializedSubscriptionRequest
        );
        HttpResponseMessage response = await _client.PostAsync(
            "subscriptions",
            new StringContent(serializedSubscriptionRequest, Encoding.UTF8, "application/json")
        );

        if (response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            Subscription? subscription = JsonSerializer.Deserialize<Subscription>(content, _jsonSerializerOptions);

            return subscription
                ?? throw new NullReferenceException(
                    "Successfully added a subscription, but the returned subscription deserialized to null!"
                );
        }
        else
        {
            var content = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "Unable to create subscription, received status {statusCode} with the following content {content}",
                response.StatusCode,
                content
            );
            throw await PlatformHttpException.CreateAsync(response);
        }
    }
}
