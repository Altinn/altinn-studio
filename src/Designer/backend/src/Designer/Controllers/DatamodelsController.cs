#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.DataModeling.Validator.Json;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
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
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{repository:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/datamodels")]
    public class DatamodelsController : ControllerBase
    {
        private readonly ISchemaModelService _schemaModelService;
        private readonly IJsonSchemaValidator _jsonSchemaValidator;
        private readonly IModelNameValidator _modelNameValidator;

        /// <summary>
        /// Initializes a new instance of the <see cref="DatamodelsController"/> class.
        /// </summary>
        /// <param name="schemaModelService">Interface for working with models.</param>
        /// <param name="jsonSchemaValidator">An <see cref="IJsonSchemaValidator"/>.</param>
        /// <param name="modelNameValidator">Interface for validating that the model name does not already belong to a data type</param>
        public DatamodelsController(ISchemaModelService schemaModelService, IJsonSchemaValidator jsonSchemaValidator, IModelNameValidator modelNameValidator)
        {
            _schemaModelService = schemaModelService;
            _jsonSchemaValidator = jsonSchemaValidator;
            _modelNameValidator = modelNameValidator;
        }

        /// <summary>
        /// Method that returns the JSON contents of a specific datamodel.
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="repository">the model repos</param>
        /// <param name="modelPath">The path to the file to get.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("datamodel")]
        public async Task<ActionResult<string>> Get([FromRoute] string org, [FromRoute] string repository, [FromQuery] string modelPath, CancellationToken cancellationToken)
        {
            var decodedPath = Uri.UnescapeDataString(modelPath);

            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            var json = await _schemaModelService.GetSchema(editingContext, decodedPath, cancellationToken);

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
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [HttpPut]
        [UseSystemTextJson]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [Route("datamodel")]
        public async Task<IActionResult> PutDatamodel(string org, string repository, [FromBody] JsonNode payload, [FromQuery] string modelPath, [FromQuery] bool saveOnly = false, CancellationToken cancellationToken = default)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            string content = payload.ToString();

            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);

            await _schemaModelService.UpdateSchema(editingContext, modelPath, content, saveOnly, cancellationToken);

            return NoContent();
        }

        /// <summary>
        /// Deletes the specified datamodel in the git repository.
        /// </summary>
        /// <param name="org">The org owning the repository.</param>
        /// <param name="repository">The repository</param>
        /// <param name="modelPath">The path to the file to be deleted.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [HttpDelete]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [Route("datamodel")]
        public async Task<IActionResult> Delete(string org, string repository, [FromQuery] string modelPath, CancellationToken cancellationToken = default)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            await _schemaModelService.DeleteSchema(editingContext, modelPath, cancellationToken);

            return NoContent();
        }

        /// <summary>
        /// Method that returns all JSON schema data models within App/models.
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="repository">the model repos</param>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status302Found)]
        [Route("json")]
        public ActionResult<IEnumerable<AltinnCoreFile>> GetJsonDataModels(string org, string repository)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            var schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);

            return Ok(schemaFiles);
        }

        /// <summary>
        /// Method that returns all xsd models within App/models.
        /// </summary>
        /// <param name="org">the org owning the models repo</param>
        /// <param name="repository">the model repos</param>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status302Found)]
        [Route("xsd")]
        public ActionResult<IEnumerable<AltinnCoreFile>> GetXsdDataModels(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            IList<AltinnCoreFile> schemaFiles = _schemaModelService.GetSchemaFiles(editingContext, true);

            return Ok(schemaFiles);
        }

        /// <summary>
        /// Upload an XSD.
        /// </summary>
        /// <remarks>
        /// This operation will use the new data modelling library to convert the XSD into a JSON schema,
        /// metadata model and C# class.
        /// </remarks>
        /// <param name="org">The short name of the application owner.</param>
        /// <param name="repository">The name of the repository to which the file is being added.</param>
        /// <param name="theFile">The XSD file being uploaded.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [Authorize(Policy = AltinnPolicy.MustBelongToOrganization)]
        [HttpPost]
        [Route("upload")]
        public async Task<IActionResult> AddXsd(string org, string repository, [FromForm(Name = "file")] IFormFile theFile, CancellationToken cancellationToken)
        {
            Request.EnableBuffering();
            Guard.AssertArgumentNotNull(theFile, nameof(theFile));

            string fileNameWithExtension = GetFileNameFromUploadedFile(theFile);
            Guard.AssertFileExtensionIsOfType(fileNameWithExtension, ".xsd");

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            var fileStream = theFile.OpenReadStream();
            await _modelNameValidator.ValidateModelNameForNewXsdSchemaAsync(fileStream, fileNameWithExtension, editingContext);
            string jsonSchema = await _schemaModelService.BuildSchemaFromXsd(editingContext, fileNameWithExtension, theFile.OpenReadStream(), cancellationToken);

            return Created(Uri.EscapeDataString(fileNameWithExtension), jsonSchema);
        }

        /// <summary>
        /// Creates a new model in the repository.
        /// </summary>
        /// <param name="org">The org owning the repository.</param>
        /// <param name="repository">The repository name</param>
        /// <param name="createModel">View model containing the data required to create the initial model.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [Produces("application/json")]
        [HttpPost]
        [Route("new")]
        public async Task<ActionResult<string>> Post(string org, string repository, [FromBody] CreateModelViewModel createModel, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            await _modelNameValidator.ValidateModelNameForNewJsonSchemaAsync(createModel.ModelName, editingContext);
            var (relativePath, model) = await _schemaModelService.CreateSchemaFromTemplate(editingContext, createModel.ModelName, createModel.RelativeDirectory, createModel.Altinn2Compatible, cancellationToken);

            // Sets the location header and content-type manually instead of using CreatedAtAction
            // because the latter overrides the content type and sets it to text/plain.
            string baseUrl = GetBaseUrl();
            string locationUrl = $"{baseUrl}/designer/api/{org}/{repository}/datamodels/datamodel?modelPath={relativePath}";
            Response.Headers.Append("Location", locationUrl);
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
            try
            {
                Guard.AssertArgumentNotNull(filePath, nameof(filePath));
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                Guard.AssertFileExtensionIsOfType(filePath, ".xsd");

                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);

                string xsd = await _schemaModelService.GetSchema(editingContext, filePath);
                using var xsdStream = new MemoryStream(Encoding.UTF8.GetBytes(xsd ?? string.Empty));
                string modelName = Path.GetFileName(filePath);

                string jsonSchema = await _schemaModelService.BuildSchemaFromXsd(editingContext, modelName, xsdStream);

                return Created(filePath, jsonSchema);
            }
            catch (FileNotFoundException)
            {
                return NoContent();
            }
        }

        /// <summary>
        /// Gets the dataType for a given data model.
        /// </summary>
        [HttpGet("datamodel/{modelName}/dataType")]
        [UseSystemTextJson]
        public async Task<ActionResult<DataType>> GetModelDataType(string org, string repository, string modelName)
        {
            DataType dataType = await _schemaModelService.GetModelDataType(org, repository, modelName);
            return Ok(dataType);
        }

        /// <summary>
        /// Updates the dataType for a given data model.
        /// </summary>
        [HttpPut("datamodel/{modelName}/dataType")]
        [UseSystemTextJson]
        public async Task<ActionResult> SetModelDataType(string org, string repository, string modelName,
            [FromBody] DataType dataType)
        {
            if (!Equals(modelName, dataType.Id))
            {
                return BadRequest("Model name in path and request body does not match");
            }

            await _schemaModelService.SetModelDataType(org, repository, modelName, dataType);
            DataType updatedDataType = await _schemaModelService.GetModelDataType(org, repository, modelName);
            return Ok(updatedDataType);
        }

        private static string GetFileNameFromUploadedFile(IFormFile thefile)
        {
            return ContentDispositionHeaderValue.Parse(new StringSegment(thefile.ContentDisposition)).FileName
                .ToString();
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

                problemDetails.Errors[validationIssue.IssuePointer] =
                    new List<string>(errorCodes) { validationIssue.ErrorCode, }.ToArray();
            }

            return validationResult.IsValid;
        }
    }
}
