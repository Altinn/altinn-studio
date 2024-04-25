﻿using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography.X509Certificates;
using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Maskinporten;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Models;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.EFormidling.Implementation
{
    /// <summary>
    /// Handles status checking of messages sent through the Eformidling integration point.
    /// </summary>
    [Obsolete("UseEformidlingStatusCheckEventHandler2 instead. This class will be removed in V9.")]
    public class EformidlingStatusCheckEventHandler : IEventHandler
    {
        private readonly IEFormidlingClient _eFormidlingClient;
        private readonly ILogger<EformidlingStatusCheckEventHandler> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMaskinportenService _maskinportenService;
        private readonly MaskinportenSettings _maskinportenSettings;
        private readonly IX509CertificateProvider _x509CertificateProvider;
        private readonly PlatformSettings _platformSettings;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="EformidlingStatusCheckEventHandler"/> class.
        /// </summary>
        public EformidlingStatusCheckEventHandler(
            IEFormidlingClient eFormidlingClient,
            IHttpClientFactory httpClientFactory,
            ILogger<EformidlingStatusCheckEventHandler> logger,
            IMaskinportenService maskinportenService,
            IOptions<MaskinportenSettings> maskinportenSettings,
            IX509CertificateProvider x509CertificateProvider,
            IOptions<PlatformSettings> platformSettings,
            IOptions<GeneralSettings> generalSettings
        )
        {
            _eFormidlingClient = eFormidlingClient;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _maskinportenService = maskinportenService;
            _maskinportenSettings = maskinportenSettings.Value;
            _x509CertificateProvider = x509CertificateProvider;
            _platformSettings = platformSettings.Value;
            _generalSettings = generalSettings.Value;
        }

        /// <inheritDoc/>
        public string EventType { get; internal set; } = EformidlingConstants.CheckInstanceStatusEventType;

        /// <inheritDoc/>
        public async Task<bool> ProcessEvent(CloudEvent cloudEvent)
        {
            var subject = cloudEvent.Subject;

            _logger.LogInformation("Received reminder for subject {subject}", subject);

            AppIdentifier appIdentifier = AppIdentifier.CreateFromUrl(cloudEvent.Source.ToString());
            InstanceIdentifier instanceIdentifier = InstanceIdentifier.CreateFromUrl(cloudEvent.Source.ToString());

            // Instance GUID is used as shipment identifier
            string id = instanceIdentifier.InstanceGuid.ToString();
            Statuses statusesForShipment = await GetStatusesForShipment(id);
            if (MessageDeliveredToKS(statusesForShipment))
            {
                // Update status on instance if message is confirmed delivered to KS.
                // The instance should wait in feedback step. This enforces a feedback step in the process in current version.
                // Moving forward sending to Eformidling should considered as a ServiceTask with auto advance in the process
                // when the message is confirmed.

                await ProcessMoveNext(appIdentifier, instanceIdentifier);
                _ = await AddCompleteConfirmation(instanceIdentifier);

                return true;
            }
            else if (MessageMalformed(statusesForShipment, out string errorMalformed))
            {
                throw new EformidlingDeliveryException(
                    $"The message with id {id} was not delivered by Eformidling to KS. Error from Eformidling: {errorMalformed}."
                );
            }
            else if (MessageTimedOutToKS(statusesForShipment, out string errorTimeout))
            {
                throw new EformidlingDeliveryException(
                    $"The message with id {id} was not delivered by Eformidling to KS. The message lifetime has expired. Error from Eformidling: {errorTimeout}"
                );
            }
            else
            {
                // The message isn't processed yet.
                // We will try again later.
                return false;
            }

            // We don't know if this is the last reminder from the Event system. If the
            // Event system gives up (after 48 hours) it will end up in the dead letter queue,
            // and be handled by the Platform team manually.
        }

        private async Task ProcessMoveNext(AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier)
        {
            string baseUrl = _generalSettings.FormattedExternalAppBaseUrl(appIdentifier);
            string url = $"{baseUrl}instances/{instanceIdentifier}/process/next";

            TokenResponse altinnToken = await GetOrganizationToken();
            HttpClient httpClient = _httpClientFactory.CreateClient();

            HttpResponseMessage response = await httpClient.PutAsync(
                altinnToken.AccessToken,
                url,
                new StringContent(string.Empty)
            );

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Moved instance {instanceId} to next step.", instanceIdentifier);
            }
            else
            {
                _logger.LogError(
                    "Failed moving instance {instanceId} to next step. Received error: {errorCode}. Received content: {content}",
                    instanceIdentifier,
                    response.StatusCode,
                    await response.Content.ReadAsStringAsync()
                );
            }
        }

        /// This is basically a duplicate of the method in <see cref="InstanceClient"/>
        /// Duplication is done since the original method requires an http context
        /// with a logged on user/org, while we would like to authenticate against maskinporten
        /// here and now and avoid calling out of the app and back into the app on the matching
        /// endpoint in InstanceController. This method should be removed once we have a better
        /// alernative for authenticating the app/org without having a http request context with
        /// a logged on user/org.
        private async Task<Instance> AddCompleteConfirmation(InstanceIdentifier instanceIdentifier)
        {
            string url =
                $"instances/{instanceIdentifier.InstanceOwnerPartyId}/{instanceIdentifier.InstanceGuid}/complete";

            TokenResponse altinnToken = await GetOrganizationToken();

            HttpClient httpClient = _httpClientFactory.CreateClient();
            httpClient.BaseAddress = new Uri(_platformSettings.ApiStorageEndpoint);
            httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            HttpResponseMessage response = await httpClient.PostAsync(
                altinnToken.AccessToken,
                url,
                new StringContent(string.Empty)
            );

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string instanceData = await response.Content.ReadAsStringAsync();
                Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData)!;
                return instance;
            }

            throw await PlatformHttpException.CreateAsync(response);
        }

        private async Task<TokenResponse> GetOrganizationToken()
        {
            X509Certificate2 x509cert = await _x509CertificateProvider.GetCertificate();
            var maskinportenToken = await _maskinportenService.GetToken(
                x509cert,
                _maskinportenSettings.Environment,
                _maskinportenSettings.ClientId,
                "altinn:serviceowner/instances.read altinn:serviceowner/instances.write",
                string.Empty
            );
            var altinnToken = await _maskinportenService.ExchangeToAltinnToken(
                maskinportenToken,
                _maskinportenSettings.Environment
            );

            return altinnToken;
        }

        private async Task<Statuses> GetStatusesForShipment(string shipmentId)
        {
            var requestHeaders = new Dictionary<string, string>
            {
                { General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey }
            };

            Statuses statuses = await _eFormidlingClient.GetMessageStatusById(shipmentId, requestHeaders);

            if (statuses != null && statuses.Content != null)
            {
                _logger.LogInformation(
                    "Received the following {count} statuses: {statusValues}.",
                    statuses.Content.Count,
                    string.Join(",", statuses.Content.Select(s => s.Status).ToArray())
                );
            }
            else
            {
                _logger.LogWarning("Did not receive any statuses for shipment id {shipmentId}", shipmentId);
                statuses ??= new Statuses();
                statuses.Content = new List<Content>();
            }

            return statuses;
        }

        private static bool MessageDeliveredToKS(Statuses statuses)
        {
            return statuses.Content.FirstOrDefault(s => s.Status.ToLower() == "levert" || s.Status.ToLower() == "lest")
                != null;
        }

        private static bool MessageTimedOutToKS(Statuses statuses, out string errorMessage)
        {
            (bool error, errorMessage) = CheckErrorStatus(statuses, "levetid_utlopt");
            return error;
        }

        private static bool MessageMalformed(Statuses statuses, out string errorMessage)
        {
            (bool error, errorMessage) = CheckErrorStatus(statuses, "feil");
            return error;
        }

        private static (bool Error, string ErrorMessage) CheckErrorStatus(Statuses statuses, string errorStatus)
        {
            bool isError = false;
            string errorMessage = string.Empty;

            var status = statuses.Content.FirstOrDefault(s => s.Status.ToLower() == errorStatus);
            if (status != null)
            {
                isError = true;
                errorMessage = status.Description;
            }

            return (isError, errorMessage);
        }
    }
}
