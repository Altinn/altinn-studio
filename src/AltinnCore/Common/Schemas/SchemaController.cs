using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Manatee.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;

namespace AltinnCore.Common.Controllers
{
    /// <summary>
    /// This controller returns all production schemas in Altinn
    /// </summary>
    public class SchemaController : Controller
    {
        /// <summary>
        /// Returns the JsonSchemas in production
        /// </summary>
        /// <returns>The schemas</returns>
        [HttpGet]
        [Route("api/v1/schemas")]
        public async Task<IActionResult> Schemas()
        {
            AltinnServiceRepository repositoryClient = new AltinnServiceRepository();

            Task<List<AltinnResource>> serviceRequestTask = AltinnServiceRepository.ReadAllSchemas();

            await Task.WhenAll(serviceRequestTask);

            if (serviceRequestTask.Result != null)
            {
                Manatee.Json.Serialization.JsonSerializer serializer = new Manatee.Json.Serialization.JsonSerializer();

                JsonValue json = serializer.Serialize(serviceRequestTask.Result);

                return Ok(json.GetIndentedString());
            }

            return NoContent();
        }
    }
}
