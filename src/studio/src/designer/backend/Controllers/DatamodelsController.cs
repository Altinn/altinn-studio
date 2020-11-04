using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Schema;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Manatee.Json;
using Manatee.Json.Schema;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to data modeling
    /// </summary>
    public class DatamodelsController : ControllerBase
    {
        /// <summary>
        /// Method that 
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="app">the model repos</param>
        /// <param name="id">The datamodel id</param>
        /// <param name="version"></param>
        [Route("/designer/api/v1/{org}/{app}/[controller]/[Action]")]
        public async Task<IActionResult> UpdateDatamodel(string org, string app, string id, string version)
        {
            using (Stream resource = Request.Body)
            {
                using StreamReader streamReader = new StreamReader(resource);
                string content = await streamReader.ReadToEndAsync();
                TextReader textReader = new StringReader(content);
                JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
                JsonSchema jsonSchemas = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);
                JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();

                XmlSchema xmlschema = jsonSchemaToXsd.CreateXsd(jsonSchemas);
            }

            return Ok();
        }
    }
}
