using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;
<<<<<<< HEAD
using PsA3Forms.Clients;
using PsA3Forms.DTOs;
=======
>>>>>>> 64e752d3f9de966e8518134708856bcdcee12c50
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Data;
<<<<<<< HEAD
using System.Reflection;
=======
>>>>>>> 64e752d3f9de966e8518134708856bcdcee12c50

namespace Altinn.App.logic
{
    public class DataProcessor : IDataProcessor
    {
        public string Id { get; set; } = "casesList";
        private readonly IDataClient _dataClient;
<<<<<<< HEAD
        private readonly TrademarkSearchResultDTO _trademarkSearchResultDTO;

        public DataProcessor(IDataClient dataClient, TrademarkSearchResultDTO trademarkSearchResultDTO)
        {
            _dataClient = dataClient;
            _trademarkSearchResultDTO = trademarkSearchResultDTO;
=======

        public DataProcessor(IDataClient dataClient)
        {
            _dataClient = dataClient;
>>>>>>> 64e752d3f9de966e8518134708856bcdcee12c50
        }

        public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string language)
        {
            return Task.CompletedTask;
        }

        public async Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object previousData, string language)
        {
            if (data is Form form)
            {
                var currentFields = await GetCurrentFields(instance, dataId.Value, data);   
                int index = (form.GoodsAndServicesProperties?.Inventory?.InventoryProperties?.Count > 0) ? form.GoodsAndServicesProperties.Inventory.InventoryProperties.Count - 1 : 0;

<<<<<<< HEAD
                if (currentFields.ContainsKey("Trademark.TrademarkType") || currentFields.ContainsKey("Trademark.TrademarkText") || currentFields.ContainsKey($"GoodsAndServicesProperties.Inventory.InventoryProperties[{index}].NiceClassification"))
                {
                    var SearchTrademarkInfoClient = new SearchTrademarkInfoClient();

=======
                if (currentFields.ContainsKey("Trademark.TrademarkType") ||
                    currentFields.ContainsKey("Trademark.TrademarkText") ||
                    currentFields.ContainsKey($"GoodsAndServicesProperties.Inventory.InventoryProperties[{index}].NiceClassification"))
                {
                    // Dummy implementation - generating fake trademark search results
>>>>>>> 64e752d3f9de966e8518134708856bcdcee12c50
                    var trademark = form.Trademark?.TrademarkType;
                    var trademarkText = form.Trademark?.TrademarkText;
                    var classes = new List<string>();
                    List<InventoryProperties> checkList = form.GoodsAndServicesProperties?.Inventory?.InventoryProperties;
                    if ((trademark == "word" || trademark == "figure") && checkList != null && trademarkText != null)
                    {
                        foreach (var item in checkList)
                        {

                            if (item.NiceClassification != null)
                            {
                                classes.Add(item.NiceClassification);
                            }
                        }
                        if (classes.Count > 0)
                        {
<<<<<<< HEAD
                            TrademarkSearchResultDTO results = await SearchTrademarkInfoClient.GetInfoAboutTrademarks(trademarkText, classes, trademark, "nb");
                            List<TrademarkDTO> trademarkList = results.Results;
                            string searchLinkUrl = results.SearchServiceLink;

                            List<SearchResult> searchResults = [];
                            foreach (var similarTrademark in trademarkList)
                            {
                                SearchResult searchResult = new()
                                {
                                    TrademarkText = similarTrademark.TrademarkText,
                                    ApplicationNumber = similarTrademark.ApplicationNumber,
                                    GoodsAndServicesClassNumber = similarTrademark.GoodsAndServicesClassNumbers,
                                    Status = similarTrademark.Status
                                };
                                searchResults.Add(searchResult);
                            }
=======
                            // Generate dummy search results
                            List<SearchResult> searchResults = new List<SearchResult>
                            {
                                new SearchResult
                                {
                                    TrademarkText = $"Similar to {trademarkText} #1",
                                    ApplicationNumber = "2024001234",
                                    GoodsAndServicesClassNumber = string.Join(", ", classes),
                                    Status = "Registered"
                                },
                                new SearchResult
                                {
                                    TrademarkText = $"Similar to {trademarkText} #2",
                                    ApplicationNumber = "2024005678",
                                    GoodsAndServicesClassNumber = classes[0],
                                    Status = "Pending"
                                }
                            };

>>>>>>> 64e752d3f9de966e8518134708856bcdcee12c50
                            if (searchResults.Count > 0)
                            {
                                SimilarTrademarks similarTrademarks = new()
                                {
                                    SearchResult = searchResults
                                };
                                form.SimilarTrademarks = similarTrademarks;
<<<<<<< HEAD
                                form.SimilarTrademarks.SearchServiceLink = searchLinkUrl;
=======
                                form.SimilarTrademarks.SearchServiceLink = "https://example.com/trademark-search";
>>>>>>> 64e752d3f9de966e8518134708856bcdcee12c50
                            }
                        }

                    }
                }

            }
        }


        private async Task<Dictionary<string, object>> GetCurrentFields(Instance instance, Guid dataId, object data)
        {
            var instanceId = Guid.Parse(instance.Id.Split("/")[1]);
            var formData = await _dataClient.GetFormData(instanceId, data.GetType(), instance.Org, instance.AppId, int.Parse(instance.InstanceOwner.PartyId), dataId);
            string formDataJsonString = JsonSerializer.Serialize(formData);
            string dataJsonString = JsonSerializer.Serialize(data);
            return JsonHelper.FindChangedFields(formDataJsonString, dataJsonString);
        }
    }
}
