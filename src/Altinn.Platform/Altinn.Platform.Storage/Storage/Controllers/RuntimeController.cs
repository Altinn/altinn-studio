using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Models;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Serilog;
using Serilog.Core;

namespace Altinn.Platform.Storage.Controllers
{
    [Route("/runtime/api/instances/{instanceId}/data")]
    [ApiController]
    public class RuntimeController : ControllerBase
    {
        private Logger logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

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
                try
                {
                   response = await client.PostAsync(url, new StreamContent(stream));                   
                }
                catch (Exception e)
                {
                    var c = 2;
                }
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
