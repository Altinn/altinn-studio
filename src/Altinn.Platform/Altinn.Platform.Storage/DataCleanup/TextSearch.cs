using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.DataCleanup.Data;
using Altinn.Platform.Storage.DataCleanup.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// Testing text search on instances
    /// </summary>
    public class TextSearch
    {
        private readonly ICosmosService _cosmosService;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextSearch"/> class.
        /// </summary>
        /// <param name="cosmosService">The Cosmos DB service.</param>
        public TextSearch(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService;
        }

        /// <summary>
        /// Load test text search 
        /// </summary>
        [FunctionName("TextSearch")]
        public async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "search")] HttpRequest req,
            ILogger log)
        {
            int partyId = int.Parse(req.Query["instanceOwner.partyId"]);
            string searchString = req.Query["searchString"];
            string language = req.Query["language"];

            // Search text with language.
            Stopwatch c1 = new Stopwatch();
            c1.Start();
            List<string> applicationIds = await _cosmosService.SearchTextResources(searchString, language);
            List<Instance> res = await _cosmosService.GetInstancesForPartyAndAppIds(partyId, applicationIds);

            c1.Stop();

            Console.WriteLine($"Search on string with lang. Then get matching apps took: {c1.ElapsedMilliseconds / 1000} s");

            // Get user instances and appIds. Search text based on appIds and language. Return matching instances.
            Stopwatch c4 = new Stopwatch();
            c4.Start();
            List<Instance> instances = await _cosmosService.GetInstancesForPartyId(partyId);
            List<string> appIdsForParty = instances.Select(i => i.AppId).Distinct().ToList();

            List<string> appIdsForText = await _cosmosService.SearchTextResources(appIdsForParty, searchString, language);

            List<Instance> matches1 = instances.Where(i => appIdsForText.Contains(i.AppId)).ToList();

            c4.Stop();

            Console.WriteLine($"Get user's instances search texts based on appIds, return matching instances: {c4.ElapsedMilliseconds / 1000} s");
            Console.WriteLine($"Found {matches1.Count} matching instances");

            return new OkObjectResult(matches1);
        }
    }
}
