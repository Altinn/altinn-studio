using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Functions.Clients.Interfaces;
using Altinn.Platform.Authorization.Functions.Exceptions;
using Altinn.Platform.Authorization.Functions.Models;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorization.Functions.Services;

/// <inheritdoc />
public class EventPusherService : IEventPusherService
{
    private readonly ILogger _logger;
    private readonly IBridgeClient _bridgeClient;
    private readonly IEventMapperService _eventMapperService;

    /// <summary>
    /// Initializes a new instance of the <see cref="EventPusherService"/> class.
    /// </summary>
    /// <param name="logger">The logger.</param>
    /// <param name="bridgeClient">The bridge client.</param>
    /// <param name="eventMapperService">The mapper service.</param>
    public EventPusherService(ILogger<EventPusherService> logger, IBridgeClient bridgeClient, IEventMapperService eventMapperService)
    {
        _logger = logger;
        _bridgeClient = bridgeClient;
        _eventMapperService = eventMapperService;
    }

    /// <summary>
    /// Pushes the events to bridge.
    /// </summary>
    /// <param name="delegationChangeEventList">The delegation change events.</param>
    /// <exception cref="BridgeRequestFailedException">Thrown if something fails, or if Bridge returns a non-successful response to ensure retry.</exception>
    public async Task PushEvents(DelegationChangeEventList delegationChangeEventList)
    {
        try
        {
            if (delegationChangeEventList == null)
            {
                _logger.LogError("Received null instead of delegation change events. Failed to deserialize model?");
                throw new BridgeRequestFailedException();
            }

            delegationChangeEventList.DelegationChangeEvents ??= new List<DelegationChangeEvent>();
            if (delegationChangeEventList.DelegationChangeEvents.Count == 0)
            {
                _logger.LogError("Received empty list of delegation change events. Failed to deserialize model?");
                return;
            }

            if (_logger.IsEnabled(LogLevel.Debug))
            {
                _logger.LogDebug(
                    "Posting delegationChangeEventList numEventsSent={numEventsSent} changeIds={changeIds}",
                    delegationChangeEventList.DelegationChangeEvents.Count,
                    GetChangeIdsForLog(delegationChangeEventList));
            }

            HttpResponseMessage response =
                await _bridgeClient.PostDelegationEventsAsync(_eventMapperService.MapToPlatformEventList(delegationChangeEventList));

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Bridge returned non-success. resultCode={resultCode} reasonPhrase={reasonPhrase} resultBody={resultBody} numEventsSent={numEventsSent} changeIds={changeIds}",
                    response.StatusCode,
                    response.ReasonPhrase,
                    await response.Content.ReadAsStringAsync(),
                    delegationChangeEventList.DelegationChangeEvents.Count,
                    GetChangeIdsForLog(delegationChangeEventList));

                // Throw exception to ensure requeue of the event list
                throw new BridgeRequestFailedException();
            }
        }
        catch (BridgeRequestFailedException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                "Exception thrown while attempting to post delegation events to Bridge. exception={exception} message={message} numEventsSent={numEventsSent} changeIds={changeIds}",
                ex.GetType().Name,
                ex.Message,
                delegationChangeEventList?.DelegationChangeEvents?.Count,
                GetChangeIdsForLog(delegationChangeEventList));

            throw new BridgeRequestFailedException();
        }
    }

    private static string GetChangeIdsForLog(DelegationChangeEventList delegationChangeEventList)
    {
        return string.Join(
            ',',
            delegationChangeEventList.DelegationChangeEvents.Select(delegationChangeEvent =>
                delegationChangeEvent.DelegationChange.PolicyChangeId));
    }
}
