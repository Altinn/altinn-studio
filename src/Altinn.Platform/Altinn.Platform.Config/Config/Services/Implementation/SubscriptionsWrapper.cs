using Altinn.Platform.Config.Clients;
using Altinn.Platform.Config.Services.Interface;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Config.Services.Implementation
{
    /// <summary>
    /// Implementation for subscriptions wrapper
    /// </summary>
    public class SubscriptionsWrapper : ISubscriptions
    {
        private readonly SubscriptionsClient _subscriptionsClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionsWrapper"/> class
        /// </summary>
        /// <param name="subscriptionsClient">the client handler for subscription api</param>
        public SubscriptionsWrapper(SubscriptionsClient subscriptionsClient)
        {
            _subscriptionsClient = subscriptionsClient;
        }

        /// <inheritdoc />
        public async Task<bool> ValidateSubscription(int partyId, string serviceCode, int serviceEditionCode)
        {
            bool result = false;

            string apiurl = $"subscriptions?partyId={partyId}&serviceCode={serviceCode}&serviceEditionCode={serviceEditionCode}";

            var response = await _subscriptionsClient.Client.GetAsync(apiurl);

            if (response.StatusCode == System.Net.HttpStatusCode.OK)
            {
                var responseData = await response.Content.ReadAsStringAsync();
                result = JsonConvert.DeserializeObject<bool>(responseData);
            }

            return result;
        }
    }
}
