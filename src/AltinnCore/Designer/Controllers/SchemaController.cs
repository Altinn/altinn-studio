using System;
using System.Collections.Generic;
using System.Linq;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Controllers
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
        public ActionResult Schemas()
        {
            AltinnServiceRepository repositoryClient = new AltinnServiceRepository();

            // List<AltinnResource> resources = await AltinnServiceRepository.GetResourcesAsync();
            // return Json(resources, new JsonSerializerSettings() { Formatting = Newtonsoft.Json.Formatting.Indented })
            return null;
        }
    }
}
