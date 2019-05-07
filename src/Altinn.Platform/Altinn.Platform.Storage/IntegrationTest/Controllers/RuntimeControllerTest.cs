using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.IntegrationTest.Helpers;
using Altinn.Platform.Storage.Models;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.IntegrationTest.Controllers
{
    /// <summary>
    /// Test controller that simulates runtime.
    /// </summary>
    [Route("/runtime/api/instances/{instanceId}/data")]
    [ApiController]
    public class RuntimeControllerTest : ControllerBase
    {
        /// <summary>
        /// Upload method
        /// </summary>
        /// <param name="instanceOwnerId">instance owner</param>
        /// <param name="instanceId">instance id</param>
        /// <param name="formId">form id</param>
        /// <returns>the instance object</returns>
        [HttpPost]
        [DisableFormValueModelBinding]
        public async Task<IActionResult> Upload(int instanceOwnerId, Guid instanceId, string formId)
        {
            Stopwatch stopWatch = new Stopwatch();
            stopWatch.Start();

            string url = $"storage/api/v1/instances/{instanceId}/data?formId={formId}&instanceOwnerId={instanceOwnerId}";

            HttpClient client = HttpClientHelper.Client;
            if (client == null)
            {
                client = new HttpClient();
            }

            Instance instance;
            HttpResponseMessage response = null;

            using (Stream stream = Request.Body)
            {
                response = await client.PostAsync(url, new StreamContent(stream));                   
            }

            if (response != null && response.IsSuccessStatusCode)
            {
                string json = await response.Content.ReadAsStringAsync();
                instance = JsonConvert.DeserializeObject<Instance>(json);

                return Ok(instance);
            }

            return BadRequest();
        }
    }
}
