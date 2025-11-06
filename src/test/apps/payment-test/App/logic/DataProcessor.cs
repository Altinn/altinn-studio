using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Data;

namespace Altinn.App.logic
{
    public class DataProcessor : IDataProcessor
    {
        public string Id { get; set; } = "casesList";
        private readonly IDataClient _dataClient;

        public DataProcessor(IDataClient dataClient)
        {
            _dataClient = dataClient;
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

                if (currentFields.ContainsKey("Trademark.TrademarkType") ||
                    currentFields.ContainsKey("Trademark.TrademarkText") ||
                    currentFields.ContainsKey($"GoodsAndServicesProperties.Inventory.InventoryProperties[{index}].NiceClassification"))
                {
                    // Dummy implementation - generating fake trademark search results
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

                            if (searchResults.Count > 0)
                            {
                                SimilarTrademarks similarTrademarks = new()
                                {
                                    SearchResult = searchResults
                                };
                                form.SimilarTrademarks = similarTrademarks;
                                form.SimilarTrademarks.SearchServiceLink = "https://example.com/trademark-search";
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
