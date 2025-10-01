using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.EFormidling;

/// <summary>
/// Hosted service to set up prequisites for Eformidling integration.
/// </summary>
public class EformidlingStartup : IHostedService
{
    private readonly AppIdentifier _appIdentifier;
    private readonly IEventsSubscription _eventsSubscriptionClient;
    private readonly ILogger<EformidlingStartup> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="EformidlingStartup"/> class.
    /// </summary>
    public EformidlingStartup(
        AppIdentifier appId,
        IEventsSubscription eventsSubscriptionClient,
        ILogger<EformidlingStartup> logger
    )
    {
        _appIdentifier = appId;
        _eventsSubscriptionClient = eventsSubscriptionClient;
        _logger = logger;
    }

    ///<inheritDoc/>
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var eventType = EformidlingConstants.CheckInstanceStatusEventType;
        try
        {
            Subscription subscription = await _eventsSubscriptionClient.AddSubscription(
                _appIdentifier.Org,
                _appIdentifier.App,
                eventType
            );

            _logger.LogInformation(
                "Successfully subscribed to event {eventType} for app {appIdentifier}. Subscription {subscriptionId} is being used.",
                eventType,
                _appIdentifier,
                subscription.Id
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                "Unable to subscribe to event {eventType} for app {appIdentifier}. Received exception {exceptionMessage} with {stackTrace}",
                eventType,
                _appIdentifier,
                ex.Message,
                ex.StackTrace
            );
            throw;
        }
    }

    /// <inheritdoc/>
    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
