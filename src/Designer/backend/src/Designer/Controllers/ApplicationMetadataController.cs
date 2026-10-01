using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller for serving/editing the application metadata json file
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/metadata")]
public class ApplicationMetadataController : ControllerBase
{
    private readonly IApplicationMetadataService _applicationMetadataService;
    private readonly IAppVersionService _appVersionService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationMetadataController"/> class.
    /// </summary>
    /// <param name="applicationMetadataService">The application metadata service</param>
    /// <param name="appVersionService">The service that tells whether an app is a v9 app</param>
    public ApplicationMetadataController(
        IApplicationMetadataService applicationMetadataService,
        IAppVersionService appVersionService
    )
    {
        _applicationMetadataService = applicationMetadataService;
        _appVersionService = appVersionService;
    }

    /// <summary>
    /// Gets the application metadata, url GET "/designer/api/org/app/metadata"
    /// </summary>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <returns>The application metadata</returns>
    /// <remarks>
    /// For a v9 app, the response has an <c>ETag</c> header. Send it back in <c>If-Match</c> to save the metadata.
    /// </remarks>
    [HttpGet]
    [UseSystemTextJson]
    public async Task<ActionResult> GetApplicationMetadata(string org, string app)
    {
        ApplicationMetadata application = await _applicationMetadataService.GetApplicationMetadataFromRepository(
            org,
            app
        );
        if (application == null)
        {
            return NotFound();
        }

        if (_appVersionService.IsV9App(HttpContext, org, app))
        {
            Response.Headers.ETag = EntityTagHelper.ComputeEntityTag(application);
        }

        return Ok(application);
    }

    /// <summary>
    /// Puts the application metadata, url PUT "/designer/api/org/app/metadata
    /// </summary>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <param name="applicationMetadata">The application metadata</param>
    /// <returns>The updated application metadata</returns>
    /// <remarks>
    /// V9 saves require the loaded ETag in <c>If-Match</c>: 428 if missing, 412 if stale.
    /// Returns the saved metadata with its new <c>ETag</c>.
    /// </remarks>
    [HttpPut]
    [UseSystemTextJson]
    public async Task<ActionResult> UpdateApplicationMetadata(
        string org,
        string app,
        [FromBody] ApplicationMetadata applicationMetadata
    )
    {
        bool isV9App = _appVersionService.IsV9App(HttpContext, org, app);
        if (isV9App)
        {
            // The v9 repository lock protects the version check and save.
            ApplicationMetadata currentApplicationMetadata =
                await _applicationMetadataService.GetApplicationMetadataFromRepository(org, app);
            ObjectResult? preconditionFailure = EntityTagHelper.CheckIfMatch(
                Request,
                EntityTagHelper.ComputeEntityTag(currentApplicationMetadata)
            );
            if (preconditionFailure is not null)
            {
                return preconditionFailure;
            }
        }

        await _applicationMetadataService.UpdateApplicationMetaDataLocally(org, app, applicationMetadata);
        ApplicationMetadata updatedApplicationMetadata =
            await _applicationMetadataService.GetApplicationMetadataFromRepository(org, app);
        if (isV9App)
        {
            Response.Headers.ETag = EntityTagHelper.ComputeEntityTag(updatedApplicationMetadata);
        }

        return Ok(updatedApplicationMetadata);
    }

    /// <summary>
    /// Create an application metadata, url POST "/designer/api/org/app/metadata"
    /// </summary>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <returns>The created application metadata</returns>
    [HttpPost]
    [UseSystemTextJson]
    public async Task<ActionResult> CreateApplicationMetadata(string org, string app)
    {
        bool applicationMetadataAlreadyExists = _applicationMetadataService.ApplicationMetadataExistsInRepository(
            org,
            app
        );
        if (applicationMetadataAlreadyExists)
        {
            return Conflict("ApplicationMetadata already exists.");
        }

        await _applicationMetadataService.CreateApplicationMetadata(org, app, app);
        ApplicationMetadata createdApplication = await _applicationMetadataService.GetApplicationMetadataFromRepository(
            org,
            app
        );
        if (createdApplication == null)
        {
            return StatusCode(500);
        }

        return Created($"/designer/api/{org}/{app}", createdApplication);
    }

    /// <summary>
    /// Adds the metadata for attachment
    /// </summary>
    /// <param name="applicationMetadata">the application meta data to be updated</param>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <returns></returns>
    [HttpPost]
    [Route("attachment-component")]
    public async Task<ActionResult> AddMetadataForAttachment(
        [FromBody] dynamic applicationMetadata,
        string org,
        string app
    )
    {
        try
        {
            await _applicationMetadataService.AddMetadataForAttachment(org, app, applicationMetadata.ToString());
            return Ok("Metadata saved");
        }
        catch (IOException)
        {
            return BadRequest("Could not save metadata");
        }
    }

    /// <summary>
    /// Updates the metadata when changing the properties for attachment component
    /// </summary>
    /// <param name="applicationMetadata">the application meta data to be updated</param>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <returns></returns>
    [HttpPut]
    [Route("attachment-component")]
    public async Task<ActionResult> UpdateMetadataForAttachment(
        [FromBody] dynamic applicationMetadata,
        string org,
        string app
    )
    {
        try
        {
            await _applicationMetadataService.UpdateMetadataForAttachment(org, app, applicationMetadata.ToString());
            return Ok("Metadata updated");
        }
        catch (IOException)
        {
            return BadRequest("Could not update metadata");
        }
    }

    /// <summary>
    /// Deletes the metadata for attachment
    /// </summary>
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organization.</param>
    /// <param name="id">the id of the component</param>
    /// <returns></returns>
    [HttpDelete]
    [Route("attachment-component")]
    public async Task<ActionResult> DeleteMetadataForAttachment(string org, string app, [FromBody] string id)
    {
        try
        {
            await _applicationMetadataService.DeleteMetadataForAttachment(org, app, id);
            return Ok("Metadata deleted");
        }
        catch (IOException)
        {
            return BadRequest("Could not delete metadata");
        }
    }
}
