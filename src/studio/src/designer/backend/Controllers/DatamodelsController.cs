using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Manatee.Json;
using Manatee.Json.Schema;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to data modeling
    /// </summary>
    [AutoValidateAntiforgeryToken]
    public class DatamodelsController : ControllerBase
    {
        private readonly IRepository _repository;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DatamodelsController"/> class.
        /// </summary>
        /// <param name="logger">The logger implementation</param>
        /// <param name="repository">The repository implementation</param>
        public DatamodelsController(ILogger<DatamodelsController> logger, IRepository repository)
        {
            _logger = logger;
            _repository = repository;
        }

        /// <summary>
        /// Method that 
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="app">the model repos</param>
        /// <param name="filepath">The path to the data model (without file ending)</param>
        [Authorize]
        [HttpPut]
        [Route("/designer/api/{org}/{app}/datamodels/[Action]")]
        public async Task<IActionResult> UpdateDatamodel(string org, string app, string filepath)
        {
            SchemaKeywordCatalog.Add<InfoKeyword>();

            using (Stream resource = Request.Body)
            {
                // Read the request body and deserialize to Json Schema
                using StreamReader streamReader = new StreamReader(resource);
                string content = await streamReader.ReadToEndAsync();
                TextReader textReader = new StringReader(content);
                JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
                JsonSchema jsonSchemas = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);

                // Serialize and store the Json Schema
                var serializer = new Manatee.Json.Serialization.JsonSerializer();
                JsonValue toar = serializer.Serialize(jsonSchemas);
                byte[] byteArray = Encoding.UTF8.GetBytes(toar.ToString());
                MemoryStream jsonstream = new MemoryStream(byteArray);
                await _repository.WriteData(org, app, $"{filepath}.schema.json", jsonstream);

                // Convert to XML Schema and store in repository
                JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();
                XmlSchema xmlschema = jsonSchemaToXsd.CreateXsd(jsonSchemas);
                MemoryStream xsdStream = new MemoryStream();
                XmlTextWriter xwriter = new XmlTextWriter(xsdStream, new UpperCaseUTF8Encoding());
                xwriter.Formatting = Formatting.Indented;
                xwriter.WriteStartDocument(false);
                xmlschema.Write(xsdStream);
                await _repository.WriteData(org, app, $"{filepath}.xsd", xsdStream);
            }

            return Ok();
        }

        /// <summary>
        /// Returns datamodel
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="repository">the repository</param>
        /// <param name="filepath">the path to datamodel </param>
        /// <returns></returns>
        [Authorize]
        [HttpGet]
        [Route("/designer/api/{org}/{repository}/datamodels/[Action]")]
        public async Task<IActionResult> GetDatamodel(string org, string repository, string filepath)
        {
            try
            {
                Stream dataStream = await _repository.ReadData(org, repository, $"{filepath}.schema.json");
                TextReader textReader = new StreamReader(dataStream);
                JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
                return Ok(jsonValue.ToString());
            }
            catch (Exception ex)
            {
                return NotFound();
            }
        }
    }
}
