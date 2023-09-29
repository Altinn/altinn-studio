using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Validator.Json;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Request;
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
    [Route("designer/api/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/datamodels")]
    public class DatamodelsController : ControllerBase
    {
        private readonly ISchemaModelService _schemaModelService;
        private readonly IJsonSchemaValidator _jsonSchemaValidator;

        /// <summary>
        /// Initializes a new instance of the <see cref="DatamodelsController"/> class.
        /// </summary>
        /// <param name="schemaModelService">Interface for working with models.</param>
        /// <param name="jsonSchemaValidator">An <see cref="IJsonSchemaValidator"/>.</param>
        public DatamodelsController(ISchemaModelService schemaModelService, IJsonSchemaValidator jsonSchemaValidator)
        {
            _schemaModelService = schemaModelService;
            _jsonSchemaValidator = jsonSchemaValidator;
        }

        /// <summary>
        /// Method that returns the JSON contents of a specific datamodel.
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="repository">the model repos</param>
        /// <param name="modelPath">The path to the file to get.</param>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("datamodel")]
        public async Task<ActionResult<string>> Get([FromRoute] string org, [FromRoute] string repository, [FromQuery] string modelPath)
        {
            var decodedPath = Uri.UnescapeDataString(modelPath);

            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var json = await _schemaModelService.GetSchema(org, repository, developer, decodedPath);

            return Ok(json);
        }

        /// <summary>
        /// Updates the specified datamodel in the git repository.
        /// </summary>
        /// <param name="org">The org owning the repository.</param>
        /// <param name="repository">The repository name</param>
        /// <param name="payload">Json schema payload</param>
        /// <param name="modelPath">The path to the file to be updated.</param>
        /// <param name="saveOnly">Flag indicating if the model should ONLY be saved (no conversion) </param>
        [HttpPut]
        [UseSystemTextJson]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [Route("datamodel")]
        public async Task<IActionResult> PutDatamodel(string org, string repository, [FromBody] JsonNode payload, [FromQuery] string modelPath, [FromQuery] bool saveOnly = false)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            string content = payload.ToString();

            if (!TryValidateSchema(content, out ValidationProblemDetails validationProblemDetails))
            {
                return UnprocessableEntity(validationProblemDetails);
            }

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
        [Route("datamodel")]
        public async Task<IActionResult> Delete(string org, string repository, [FromQuery] string modelPath)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
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
        [Route("all-json")]
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
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status302Found)]
        [Route("all-xsd")]
        public ActionResult<IEnumerable<AltinnCoreFile>> GetXSDDatamodels(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            IList<AltinnCoreFile> schemaFiles = _schemaModelService.GetSchemaFiles(org, repository, developer, true);

            return Ok(schemaFiles);
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
        [HttpPost]
        [Route("upload")]
        public async Task<IActionResult> AddXsd(string org, string repository, [FromForm(Name = "file")] IFormFile thefile)
        {
            Guard.AssertArgumentNotNull(thefile, nameof(thefile));

            string fileName = GetFileNameFromUploadedFile(thefile);
            Guard.AssertFileExtensionIsOfType(fileName, ".xsd");

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            string jsonSchema = await _schemaModelService.BuildSchemaFromXsd(org, repository, developer, fileName, thefile.OpenReadStream());

            return Created(Uri.EscapeDataString(fileName), jsonSchema);
        }

        /// <summary>
        /// Creates a new model in the repository.
        /// </summary>
        /// <param name="org">The org owning the repository.</param>
        /// <param name="repository">The repository name</param>
        /// <param name="createModel">View model containing the data required to create the initial model.</param>
        [Produces("application/json")]
        [HttpPost]
        [Route("new")]
        public async Task<ActionResult<string>> Post(string org, string repository, [FromBody] CreateModelViewModel createModel)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var (relativePath, model) = await _schemaModelService.CreateSchemaFromTemplate(org, repository, developer, createModel.ModelName, createModel.RelativeDirectory, createModel.Altinn2Compatible);

            // Sets the location header and content-type manually instead of using CreatedAtAction
            // because the latter overrides the content type and sets it to text/plain.
            string baseUrl = GetBaseUrl();
            string locationUrl = $"{baseUrl}/designer/api/{org}/{repository}/datamodels/datamodel?modelPath={relativePath}";
            Response.Headers.Add("Location", locationUrl);
            Response.StatusCode = (int)HttpStatusCode.Created;

            return Content(model, "application/json");
        }

        private string GetBaseUrl()
        {
            return $"{Request.Scheme}{(Request.IsHttps ? "s" : string.Empty)}://{Request.Host}";
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
        [HttpPost]
        [Route("xsd-from-repo")]
        public async Task<IActionResult> UseXsdFromRepo(string org, string repository, string filePath)
        {
            Guard.AssertArgumentNotNull(filePath, nameof(filePath));
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            Guard.AssertFileExtensionIsOfType(filePath, ".xsd");

            string xsd = await _schemaModelService.GetSchema(org, repository, developer, filePath);
            var xsdStream = new MemoryStream(Encoding.UTF8.GetBytes(xsd ?? string.Empty));
            string jsonSchema = await _schemaModelService.BuildSchemaFromXsd(org, repository, developer, filePath, xsdStream);

            return Created(filePath, jsonSchema);
        }

        private static string GetFileNameFromUploadedFile(IFormFile thefile)
        {
            return ContentDispositionHeaderValue.Parse(new StringSegment(thefile.ContentDisposition)).FileName.ToString();
        }

        private bool TryValidateSchema(string schema, out ValidationProblemDetails problemDetails)
        {
            JsonSchemaValidationResult validationResult;
            problemDetails = null;
            try
            {
                validationResult = _jsonSchemaValidator.Validate(schema);
            }
            catch // Validator is quite new and not 100% stable yet. If it fails, we won't assume the schema is invalid.
            {
                return true;
            }

            if (validationResult.IsValid)
            {
                return true;
            }

            problemDetails = new ValidationProblemDetails
            {
                Detail = "Json schema has invalid structure",
                Status = (int)HttpStatusCode.BadRequest
            };

            foreach (var validationIssue in validationResult.ValidationIssues)
            {
                if (!problemDetails.Errors.TryGetValue(validationIssue.IssuePointer, out string[] errorCodes))
                {
                    problemDetails.Errors.Add(validationIssue.IssuePointer, new[] { validationIssue.ErrorCode });

                    continue;
                }

                problemDetails.Errors[validationIssue.IssuePointer] = new List<string>(errorCodes)
                {
                    validationIssue.ErrorCode,
                }.ToArray();
            }

            return validationResult.IsValid;
        }
    }
}
