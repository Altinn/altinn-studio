using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Clients;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Wrapper for the parties api
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class PartiesWrapper : IParties
    {
        private readonly PartyClient _partyClient;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWrapper"/> class
        /// </summary>
        /// <param name="partyClient">the client handler for parties api in Bridge</param>
        /// <param name="logger">The logger</param>
        public PartiesWrapper(PartyClient partyClient, ILogger<PartiesWrapper> logger)
        {
            _partyClient = partyClient;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<List<Party>> GetParties(int userId)
        {
            List<Party> partiesList = null;

            try
            {
                string endpointUrl = $"parties?userid={userId}";
                HttpResponseMessage response = await _partyClient.Client.GetAsync(endpointUrl);
                string partiesDataList = await response.Content.ReadAsStringAsync();
                if (response.IsSuccessStatusCode)
                {
                    return JsonConvert.DeserializeObject<List<Party>>(partiesDataList);
                }

                _logger.LogError("SBL-Bridge // PartiesWrapper // parties // Failed // Unexpected HttpStatusCode: {response.StatusCode}\n {jsonResponse}", response.StatusCode, partiesDataList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SBL-Bridge // PartiesWrapper // parties // Failed // Unexpected Exception");
                throw;
            }

            return partiesList;
        }

        /// <inheritdoc/>
        public async Task<List<int>> GetKeyRoleParties(int userId)
        {
            List<int> keyroleParties = null;

            try
            {
                string endpointUrl = $"partieswithkeyroleaccess?userid={userId}";
                HttpResponseMessage response = await _partyClient.Client.GetAsync(endpointUrl);
                string responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return JsonConvert.DeserializeObject<List<int>>(responseBody);
                }

                _logger.LogError("SBL-Bridge // PartiesWrapper // partieswithkeyroleaccess // Failed // Unexpected HttpStatusCode: {response.StatusCode}\n {responseBody}", response.StatusCode, responseBody);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SBL-Bridge // PartiesWrapper // partieswithkeyroleaccess // Failed // Unexpected Exception");
                throw;
            }

            return keyroleParties;
        }

        /// <inheritdoc/>
        public async Task<List<MainUnit>> GetMainUnits(MainUnitQuery subunitPartyIds)
        {
            List<MainUnit> mainUnits = null;

            try
            {
                HttpRequestMessage request = new HttpRequestMessage
                {
                    Method = HttpMethod.Get,
                    RequestUri = new Uri($"{_partyClient.Client.BaseAddress}partyparents"),
                    Content = new StringContent(JsonConvert.SerializeObject(subunitPartyIds), Encoding.UTF8, "application/json")
                };

                HttpResponseMessage response = await _partyClient.Client.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return JsonConvert.DeserializeObject<List<MainUnit>>(responseBody);
                }

                _logger.LogError("SBL-Bridge // PartiesWrapper // partyparents // Failed // Unexpected HttpStatusCode: {response.StatusCode}\n {responseBody}", response.StatusCode, responseBody);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SBL-Bridge // PartiesWrapper // partyparents // Failed // Unexpected Exception");
                throw;
            }

            return mainUnits;
        }

        /// <inheritdoc />
        public async Task<bool> ValidateSelectedParty(int userId, int partyId)
        {
            bool result = false;

            List<Party> partyList = await GetParties(userId);

            if (partyList.Count > 0)
            {
                result = partyList.Any(p => p.PartyId == partyId) || partyList.Any(p => p.ChildParties != null && p.ChildParties.Count > 0 && p.ChildParties.Any(cp => cp.PartyId == partyId));
            }

            return result;
        }
    }
}
