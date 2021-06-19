using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;

using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

using Manatee.Json;
using Manatee.Json.Schema;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to data modeling
    /// </summary>
    [AutoValidateAntiforgeryToken]
    public class DatamodelsController : ControllerBase
    {
        private readonly IRepository _repository;
        private readonly ISchemaModelService _schemaModelService;

        /// <summary>
        /// Initializes a new instance of the <see cref="DatamodelsController"/> class.
        /// </summary>
        /// <param name="repository">The repository implementation</param>
        /// <param name="schemaModelService">Interface for working with models.</param>
        public DatamodelsController(IRepository repository, ISchemaModelService schemaModelService)
        {
            _repository = repository;
            _schemaModelService = schemaModelService;
        }

        /// <summary>
        /// Method that 
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="app">the model repos</param>
        /// <param name="modelName">The name of the data model.</param>
        [Authorize]
        [HttpPut]
        [Route("/designer/api/{org}/{app}/datamodels/[Action]")]
        public async Task<IActionResult> UpdateDatamodel(string org, string app, string modelName)
        {
            SchemaKeywordCatalog.Add<InfoKeyword>();

            try
            {
                modelName = modelName.AsFileName();
            }
            catch
            {
                return BadRequest("Invalid model name value.");
            }

            string filePath = $"App/models/{modelName}";
            using (Stream resource = Request.Body)
            {
                // Read the request body and deserialize to Json Schema
                using StreamReader streamReader = new StreamReader(resource);
                string content = await streamReader.ReadToEndAsync();
                TextReader textReader = new StringReader(content);
                JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
                JsonSchema jsonSchemas = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);

                // Create the directory if it does not exist
                string appPath = _repository.GetAppPath(org, app);
                string directory = appPath + Path.GetDirectoryName(filePath);
                if (!Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                // Serialize and store the Json Schema
                var serializer = new Manatee.Json.Serialization.JsonSerializer();
                JsonValue toar = serializer.Serialize(jsonSchemas);
                byte[] byteArray = Encoding.UTF8.GetBytes(toar.ToString());
                MemoryStream jsonstream = new MemoryStream(byteArray);
                await _repository.WriteData(org, app, $"{filePath}.schema.json", jsonstream);

                // update meta data
                JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, app, jsonSchemas);
                ModelMetadata modelMetadata = converter.GetModelMetadata();
                string root = modelMetadata.Elements != null && modelMetadata.Elements.Count > 0 ? modelMetadata.Elements.Values.First(e => e.ParentElement == null).TypeName : null;
                _repository.UpdateApplicationWithAppLogicModel(org, app, modelName, "Altinn.App.Models." + root);
                _repository.UpdateModelMetadata(org, app, modelMetadata, modelName);

                // Convert to XML Schema and store in repository
                JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();
                XmlSchema xmlschema = jsonSchemaToXsd.CreateXsd(jsonSchemas);
                MemoryStream xsdStream = new MemoryStream();
                XmlTextWriter xwriter = new XmlTextWriter(xsdStream, new UpperCaseUtf8Encoding());
                xwriter.Formatting = Formatting.Indented;
                xwriter.WriteStartDocument(false);
                xmlschema.Write(xsdStream);
                await _repository.WriteData(org, app, $"{filePath}.xsd", xsdStream);

                // Generate updated C# model
                JsonMetadataParser modelGenerator = new JsonMetadataParser();
                string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
                byteArray = Encoding.UTF8.GetBytes(classes);
                MemoryStream stream = new MemoryStream(byteArray);
                await _repository.WriteData(org, app, $"{filePath}.cs", stream);
            }

            return Ok();
        }

        /// <summary>
        /// Method that returns all datamodels within repository.
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="repository">the model repos</param>
        /// <returns></returns>
        [Authorize]
        [HttpGet]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [Route("/designer/api/{org}/{repository}/datamodels")]
        public async Task<ActionResult<IEnumerable<AltinnCoreFile>>> GetDatamodels(string org, string repository)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var schemaFiles = _schemaModelService.GetSchemaFilesAsync(org, repository, developer);

            return Ok(schemaFiles);
        }        

        /// <summary>
        /// Returns datamodel
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="repository">the repository</param>
        /// <param name="modelName">The name of the data model.</param>
        /// <returns></returns>
        [Authorize]
        [HttpGet]
        [Route("/designer/api/{org}/{repository}/datamodels/[Action]")]
        public async Task<IActionResult> GetDatamodel(string org, string repository, string modelName)
        {
            try
            {
                modelName = modelName.AsFileName();
            }
            catch
            {
                return BadRequest("Invalid model name value.");
            }

            string filePath = $"App/models/{modelName}";
            try
            {
                using (Stream dataStream = await _repository.ReadData(org, repository, $"{filePath}.schema.json"))
                {
                    TextReader textReader = new StreamReader(dataStream);
                    JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
                    return Ok(jsonValue.ToString());
                }
            }
            catch
            {
                // Will fallback to checking for XSD. See below
            }

            try
            {
                using (Stream dataStream = await _repository.ReadData(org, repository, $"{filePath}.xsd"))
                {
                    XmlReader xsdReader = XmlReader.Create(dataStream);
                    XsdToJsonSchema xsdToJsonSchemaConverter = new XsdToJsonSchema(xsdReader);
                    JsonSchema convertedSchema = xsdToJsonSchemaConverter.AsJsonSchema();

                    Manatee.Json.Serialization.JsonSerializer serializer = new Manatee.Json.Serialization.JsonSerializer();
                    JsonValue serializedConvertedSchema = serializer.Serialize(convertedSchema);

                    return Ok(serializedConvertedSchema.ToString());
                }
            }
            catch
            {
                return NotFound();
            }
        }

        /// <summary>
        /// Deletes datamodel by name
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="repository">the repository</param>
        /// <param name="modelName">The name of the data model.</param>
        [Authorize]
        [HttpDelete]
        [Route("/designer/api/{org}/{repository}/datamodels/[Action]")]
        public IActionResult DeleteDatamodel(string org, string repository, string modelName)
        {
            try
            {
                modelName = modelName.AsFileName();
            }
            catch
            {
                return BadRequest("Invalid model name value.");
            }

            if (_repository.DeleteMetadataForAttachment(org, repository, modelName))
            {
                string filePath = $"App/models/{modelName}";
                _repository.DeleteData(org, repository, $"{filePath}.schema.json");
                _repository.DeleteData(org, repository, $"{filePath}.xsd");
                return Ok();
            }

            return BadRequest();
        }
    }
}
