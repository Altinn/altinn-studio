using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
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
using Altinn.Studio.Designer.ViewModels.Request;
using Manatee.Json;
using Manatee.Json.Schema;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to data modelling
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{repository}/datamodels")]
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
        /// <param name="repository">the model repos</param>
        /// <param name="modelName">The name of the data model.</param>
        /// <remarks>Deprecated use <see cref="PutDatamodel(string, string, string, bool)"/> instead.</remarks>
        [HttpPut]
        [Route("updatedatamodel")]
        public async Task<IActionResult> UpdateDatamodel(string org, string repository, string modelName)
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
                string appPath = _repository.GetAppPath(org, repository);
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
                await _repository.WriteData(org, repository, $"{filePath}.schema.json", jsonstream);

                // update meta data
                JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, repository, jsonSchemas);
                ModelMetadata modelMetadata = converter.GetModelMetadata();
                string root = modelMetadata.Elements != null && modelMetadata.Elements.Count > 0 ? modelMetadata.Elements.Values.First(e => e.ParentElement == null).TypeName : null;
                _repository.UpdateApplicationWithAppLogicModel(org, repository, modelName, "Altinn.App.Models." + root);
                _repository.UpdateModelMetadata(org, repository, modelMetadata, modelName);

                // Convert to XML Schema and store in repository
                JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();
                XmlSchema xmlschema = jsonSchemaToXsd.CreateXsd(jsonSchemas);
                MemoryStream xsdStream = new MemoryStream();
                XmlTextWriter xwriter = new XmlTextWriter(xsdStream, new UpperCaseUtf8Encoding());
                xwriter.Formatting = Formatting.Indented;
                xwriter.WriteStartDocument(false);
                xmlschema.Write(xsdStream);
                await _repository.WriteData(org, repository, $"{filePath}.xsd", xsdStream);

                // Generate updated C# model
                JsonMetadataParser modelGenerator = new JsonMetadataParser();
                string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
                byteArray = Encoding.UTF8.GetBytes(classes);
                MemoryStream stream = new MemoryStream(byteArray);
                await _repository.WriteData(org, repository, $"{filePath}.cs", stream);
            }

            return Ok();
        }

        /// <summary>
        /// Post action that is used when uploading a XSD and secondary XSD. TODO: To be removed?
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">Application identifier which is unique within an organisation.</param>
        /// <param name="xsdFile">The main XSD</param>
        /// <returns>Return JSON of the generated model</returns>
        [HttpPost]
        public async Task<ActionResult<string>> Upload(string org, string repository, [FromForm(Name = "file")] IFormFile xsdFile)
        {
            Guard.AssertArgumentNotNull(xsdFile, nameof(xsdFile));

            string mainFileName = GetFileNameFromUploadedFile(xsdFile);
            Guard.AssertFileExtensionIsOfType(mainFileName, ".xsd");

            MemoryStream fileMemoryStream = CopyFileStream(xsdFile);

            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            var jsonSchema = await _schemaModelService.CreateSchemaFromXsd(org, repository, developer, mainFileName, fileMemoryStream);

            return Created(mainFileName, jsonSchema);
        }

        /// <summary>
        /// Upload an XSD.
        /// </summary>
        /// <remarks>
        /// This operation will use the new datamodelling library to convert the XSD into a JSON schema,
        /// metadata model and C# class.
        /// </remarks>
        /// <param name="org">The short name of the application owner.</param>
        /// <param name="repository">The name of the repository to which the file is being added.</param>
        /// <param name="thefile">The XSD file being uploaded.</param>
        [HttpPost("upload")]
        public async Task<IActionResult> AddXsd(string org, string repository, [FromForm(Name = "file")] IFormFile thefile)
        {
            Guard.AssertArgumentNotNull(thefile, nameof(thefile));

            string fileName = GetFileNameFromUploadedFile(thefile);
            Guard.AssertFileExtensionIsOfType(fileName, ".xsd");

            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            var jsonSchema = await _schemaModelService.BuildSchemaFromXsd(org, repository, developer, fileName, thefile.OpenReadStream());

            return Created(Uri.EscapeDataString(fileName), jsonSchema);
        }

        /// <summary>
        /// Generates model files from existing XSD in (datamodelling) repo
        /// </summary>
        /// <remarks>
        /// This operation will use the new datamodelling library to convert the XSD into a JSON schema
        /// </remarks>
        /// <param name="org">The short name of the application owner.</param>
        /// <param name="repository">The name of the repository to which the file is being added.</param>
        /// <param name="filePath">The path to the XSD to use</param>
        [HttpPost("xsd-from-repo")]
        public async Task<IActionResult> UseXsdFromRepo(string org, string repository, string filePath)
        {
            Guard.AssertArgumentNotNull(filePath, nameof(filePath));
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            Guard.AssertFileExtensionIsOfType(filePath, ".xsd");

            var xsd = await _schemaModelService.GetSchema(org, repository, developer, filePath);
            var xsdStream = new MemoryStream(Encoding.UTF8.GetBytes(xsd ?? string.Empty));
            var jsonSchema = await _schemaModelService.BuildSchemaFromXsd(org, repository, developer, filePath, xsdStream);

            return Created(filePath, jsonSchema);
        }

        /// <summary>
        /// Creates a new model in the repository.
        /// </summary>
        /// <param name="org">The org owning the repository.</param>
        /// <param name="repository">The repository name</param>
        /// <param name="createModel">View model containing the data required to create the initial model.</param>
        [Produces("application/json")]
        [HttpPost]
        [Route("post")]
        public async Task<ActionResult<string>> Post(string org, string repository, [FromBody] CreateModelViewModel createModel)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var (relativePath, model) = await _schemaModelService.CreateSchemaFromTemplate(org, repository, developer, createModel.ModelName, createModel.RelativeDirectory, createModel.Altinn2Compatible);

            // Sets the location header and content-type manually instead of using CreatedAtAction
            // because the latter overrides the content type and sets it to text/plain.
            var baseUrl = GetBaseUrl();
            var locationUrl = $"{baseUrl}/designer/api/{org}/{repository}/datamodels/{relativePath}";
            Response.Headers.Add("Location", locationUrl);
            Response.StatusCode = (int)HttpStatusCode.Created;

            return Content(model, "application/json");
        }

        private string GetBaseUrl()
        {
            return $"{Request.Scheme}{(Request.IsHttps ? "s" : string.Empty)}://{Request.Host}";
        }

        /// <summary>
        /// Updates the specified datamodel in the git repository.
        /// </summary>
        /// <param name="org">The org owning the repository.</param>
        /// <param name="repository">The repository name</param>
        /// <param name="modelPath">The path to the file to be updated.</param>
        /// <param name="saveOnly">Flag indicating if the model should ONLY be saved (no conversion) </param>
        [HttpPut]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> PutDatamodel(string org, string repository, [FromQuery] string modelPath, [FromQuery] bool saveOnly = false)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var content = await ReadRequestBodyContentAsync();

            await _schemaModelService.UpdateSchema(org, repository, developer, modelPath, content, saveOnly);

            return NoContent();
        }

        /// <summary>
        /// Deletes the specified datamodel in the git repository.
        /// </summary>
        /// <param name="org">The org owning the repository.</param>
        /// <param name="repository">The repository</param>
        /// <param name="modelPath">The path to the file to be deleted.</param>
        [HttpDelete]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Delete(string org, string repository, [FromQuery] string modelPath)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            await _schemaModelService.DeleteSchema(org, repository, developer, modelPath);

            return NoContent();
        }

        /// <summary>
        /// Method that returns all JSON schema datamodels within repository.
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="repository">the model repos</param>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status302Found)]
        public ActionResult<IEnumerable<AltinnCoreFile>> GetDatamodels(string org, string repository)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var schemaFiles = _schemaModelService.GetSchemaFiles(org, repository, developer);

            return Ok(schemaFiles);
        }

        /// <summary>
        /// Method that returns all xsd models within repository.
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="repository">the model repos</param>
        [HttpGet("xsd")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status302Found)]
        public ActionResult<IEnumerable<AltinnCoreFile>> GetXSDDatamodels(string org, string repository)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var schemaFiles = _schemaModelService.GetSchemaFiles(org, repository, developer, true);

            return Ok(schemaFiles);
        }

        /// <summary>
        /// Method that returns the JSON contents of a specific datamodel.
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="repository">the model repos</param>
        /// <param name="modelPath">The path to the file to get.</param>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("{*modelPath}")]
        public async Task<ActionResult<string>> Get([FromRoute] string org, [FromRoute] string repository, [FromRoute] string modelPath)
        {
            var decodedPath = System.Uri.UnescapeDataString(modelPath);

            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var json = await _schemaModelService.GetSchema(org, repository, developer, decodedPath);

            return Ok(json);
        }

        /// <summary>
        /// Returns datamodel
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="repository">the repository</param>
        /// <param name="modelName">The name of the data model.</param>
        /// <returns></returns>
        [HttpGet]
        [Route("getdatamodel")]
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
        [HttpDelete]
        [Route("deletedatamodel")]
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

        private async Task<string> ReadRequestBodyContentAsync()
        {
            string content;

            using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
            {
                content = await reader.ReadToEndAsync();
            }

            return content;
        }

        private static MemoryStream CopyFileStream(IFormFile thefile)
        {
            var memoryStream = new MemoryStream();
            thefile.OpenReadStream().CopyTo(memoryStream);
            memoryStream.Position = 0;

            return memoryStream;
        }

        private static string GetFileNameFromUploadedFile(IFormFile thefile)
        {
            return ContentDispositionHeaderValue.Parse(new StringSegment(thefile.ContentDisposition)).FileName.ToString();
        }
    }
}
