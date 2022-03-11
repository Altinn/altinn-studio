using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Functions.Clients;
using Altinn.Platform.Authorization.Functions.Exceptions;
using Altinn.Platform.Authorization.Functions.Models;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authorization.Functions.Services
{
    public class EventPusherService : IEventPusherService
    {
        private readonly ILogger _logger;
        private readonly BridgeClient _bridgeClient;

        public EventPusherService(ILogger<EventPusherService> logger, BridgeClient bridgeClient)
        {
            _logger = logger;
            _bridgeClient = bridgeClient;
        }

        public async Task PushEvents(DelegationChangeEventList delegationChangeEventList)
        {
            delegationChangeEventList.DelegationChangeEvents ??= new List<DelegationChangeEvent>();
            try
            {
                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    _logger.LogDebug(
                        "Posting delegationChangeEventList numEventsSent={numEventsSent} changeIds={changeIds}",
                        delegationChangeEventList.DelegationChangeEvents.Count,
                        GetChangeIdsForLog(delegationChangeEventList));
                }

                HttpResponseMessage response =
                    await _bridgeClient.PostDelegationEventsAsync(MapToBridgeModel(delegationChangeEventList));

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
                    delegationChangeEventList.DelegationChangeEvents.Count,
                    GetChangeIdsForLog(delegationChangeEventList));

                throw new BridgeRequestFailedException();
            }
        }

        private static List<PlatformDelegationEvent> MapToBridgeModel(DelegationChangeEventList delegationChangeEventList)
        {
            return delegationChangeEventList.DelegationChangeEvents.Select(delegationChangeEvent => new PlatformDelegationEvent()
                {
                    EventType = delegationChangeEvent.EventType,
                    PolicyChangeId = delegationChangeEvent.DelegationChange.PolicyChangeId,
                    Created = delegationChangeEvent.DelegationChange.Created,
                    AltinnAppId = delegationChangeEvent.DelegationChange.AltinnAppId,
                    OfferedByPartyId = delegationChangeEvent.DelegationChange.OfferedByPartyId,
                    CoveredByPartyId = delegationChangeEvent.DelegationChange.CoveredByPartyId ?? 0,
                    CoveredByUserId = delegationChangeEvent.DelegationChange.CoveredByUserId ?? 0,
                    PerformedByUserId = delegationChangeEvent.DelegationChange.PerformedByUserId
                })
                .ToList();
        }

        private static string GetChangeIdsForLog(DelegationChangeEventList delegationChangeEventList)
        {
            return string.Join(',',
                delegationChangeEventList.DelegationChangeEvents.Select(delegationChangeEvent =>
                    delegationChangeEvent.DelegationChange.PolicyChangeId));
        }
    }
}
