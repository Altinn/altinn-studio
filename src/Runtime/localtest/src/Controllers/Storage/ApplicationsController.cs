using System;
using System.Collections.Generic;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// Provides operations for handling application metadata
    /// </summary>
    [Route("storage/api/v1/applications")]
    [ApiController]
    public class ApplicationsController : ControllerBase
    {
        private readonly IApplicationRepository repository;
        private readonly ILogger logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationsController"/> class
        /// </summary>
        /// <param name="repository">the application repository handler</param>
        /// <param name="logger">dependency injection of logger</param>
        public ApplicationsController(IApplicationRepository repository, ILogger<ApplicationsController> logger)
        {
            this.logger = logger;
            this.repository = repository;
        }

        /// <summary>
        /// Get all applications.
        /// </summary>
        /// <returns>List of all applications</returns>
        [AllowAnonymous]
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Produces("application/json")]
        public async Task<ActionResult<ApplicationList>> GetAll()
        {
            List<Application> applications = await repository.FindAll();
            ApplicationList applicationList = new ApplicationList { Applications = applications };
            return Ok(applicationList);
        }

        /// <summary>
        /// Get all applications deployed by a given application owner.
        /// </summary>
        /// <param name="org">The id of the application owner.</param>
        /// <returns>List of all applications depoyed by the given owner.</returns>
        [AllowAnonymous]
        [HttpGet("{org}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<ApplicationList>> GetMany(string org)
        {
            if (string.IsNullOrEmpty(org) || org.Contains('-') || org.Contains(' '))
            {
                return BadRequest($"Application owner id '{org}' is not valid");
            }

            List<Application> applications = await repository.FindByOrg(org);

            ApplicationList applicationList = new ApplicationList { Applications = applications };

            return Ok(applicationList);
        }

        /// <summary>
        /// Get the metadata for a spesific application based on the given application identifiers.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The metadata for the identified application.</returns>
        [AllowAnonymous]
        [HttpGet("{org}/{app}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<Application>> GetOne(string org, string app)
        {
            string appId = $"{org}/{app}";

            Application result = await repository.FindOne(appId, org);

            if (result == null)
            {
                return NotFound($"Could not find an application with appId={appId}");
            }

            return Ok(result);
        }

        /// <summary>
        /// Inserts metadata about a new application.
        /// </summary>
        /// <param name="appId">The unique identification of the application to be added. Format: '{org}/{app}'</param>
        /// <param name="application">The application metadata object to store.</param>
        /// <returns>The applicaiton metadata object.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_STUDIO_DESIGNER)]
        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Produces("application/json")]
        public async Task<ActionResult<Application>> Post(string appId, [FromBody] Application application)
        {
            if (!IsValidAppId(appId))
            {
                return BadRequest("AppId is not valid.");
            }

            string org = appId.Split("/")[0];

            var existingApp = await repository.FindOne(appId, org);

            if (existingApp != null)
            {
                return BadRequest("Application already exists in repository! Try update application instead. ");
            }

            DateTime creationTime = DateTime.UtcNow;

            // make sure minimum application values are set
            application.Id = appId;
            application.Org = org;
            application.CreatedBy = GetUserId();
            application.Created = creationTime;
            application.LastChangedBy = GetUserId();
            application.LastChanged = creationTime;
            application.DataTypes ??= new();

            if (application.ValidFrom == null)
            {
                application.ValidFrom = creationTime;
            }

            Application result = await repository.Create(application);

            logger.LogInformation($"Application {appId} sucessfully stored", result);

            return Created(appId, result);
        }

        /// <summary>
        /// Updates application metadata for a given application.
        /// </summary>
        /// <param name="org">The id of theowner of the application to update.</param>
        /// <param name="app">The name of the application.</param>
        /// <param name="application">The application metadata object to store.</param>
        /// <returns>The updated application metadata.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_STUDIO_DESIGNER)]
        [HttpPut("{org}/{app}")]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<Application>> Put(string org, string app, [FromBody] Application application)
        {
            string appId = $"{org}/{app}";

            if (!IsValidAppId(appId))
            {
                return BadRequest($"Illegal appId {appId}");
            }

            if (application.Id == null || !application.Id.Equals(appId))
            {
                return BadRequest("appId in path does not match id in attached object");
            }

            if (application.Org == null || !application.Org.Equals(org))
            {
                return BadRequest("Org (application owner id) from path is not matching attached object");
            }

            Application existingApplication;

            existingApplication = await repository.FindOne(appId, org);

            if (existingApplication == null)
            {
                return NotFound($"Cannot find application {appId}");
            }

            existingApplication.LastChangedBy = GetUserId();
            existingApplication.LastChanged = DateTime.UtcNow;

            existingApplication.VersionId = application.VersionId;
            existingApplication.ValidTo = application.ValidTo;
            existingApplication.ValidFrom = application.ValidFrom;
            existingApplication.Title = application.Title;
            existingApplication.ProcessId = application.ProcessId;
            existingApplication.DataTypes = application.DataTypes;
            existingApplication.PartyTypesAllowed = application.PartyTypesAllowed ?? new PartyTypesAllowed();
            existingApplication.AutoDeleteOnProcessEnd = application.AutoDeleteOnProcessEnd;
            existingApplication.PresentationFields = application.PresentationFields;
            existingApplication.OnEntry = application.OnEntry;
            existingApplication.DataFields = application.DataFields;
            existingApplication.MessageBoxConfig = application.MessageBoxConfig;
            existingApplication.CopyInstanceSettings = application.CopyInstanceSettings;

            Application result = await repository.Update(existingApplication);

            return Ok(result);
        }

        /// <summary>
        /// Delete an application metadata object. Applications will not be deleted, but will be marked as deleted.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="hard">Controls whether the application should be deleted permanently.</param>
        /// <returns>The application metadata of the deleted application.</returns>
        [Authorize(Policy = AuthzConstants.POLICY_STUDIO_DESIGNER)]
        [HttpDelete("{org}/{app}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Produces("application/json")]
        public async Task<ActionResult<Application>> Delete(string org, string app, bool? hard)
        {
            string appId = $"{org}/{app}";
            string appOwnerId = org;

            Application application = await repository.FindOne(appId, appOwnerId);

            if (application == null)
            {
                return NotFound($"Didn't find the object that should be deleted with appId={appId}");
            }

            if (hard.HasValue && hard == true)
            {
                await repository.Delete(appId, appOwnerId);

                return Ok(application);
            }
            else
            {
                DateTime timestamp = DateTime.UtcNow;

                application.LastChangedBy = GetUserId();
                application.LastChanged = timestamp;
                application.ValidTo = timestamp;

                Application softDeleteApplication = await repository.Update(application);

                return Ok(softDeleteApplication);
            }
        }

        /// <summary>
        /// Checks if an appId is valid
        /// </summary>
        /// <param name="appId">the id to check</param>
        /// <returns>true if it is valid, false otherwise</returns>
        [ApiExplorerSettings(IgnoreApi = true)]
        public bool IsValidAppId(string appId)
        {
            if (string.IsNullOrEmpty(appId))
            {
                return false;
            }

            string[] parts = appId.Split("/");

            if (parts.Length != 2)
            {
                return false;
            }

            string orgNamePattern = @"^[a-zæøå][a-zæåø0-9]*$";
            if (!Regex.IsMatch(parts[0], orgNamePattern))
            {
                return false;
            }

            string appPattern = @"^[a-zæøå][a-zæøå0-9\-]*$";
            if (!Regex.IsMatch(parts[1], appPattern))
            {
                return false;
            }

            return true;
        }

        private string GetUserId()
        {
            return User?.Identity?.Name;
        }
    }
}
