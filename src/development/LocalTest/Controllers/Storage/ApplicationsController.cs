namespace Altinn.Platform.Storage.Controllers
{
    using System;
    using System.Collections.Generic;

    using System.Net;
    using System.Text.RegularExpressions;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Interface.Models;
    using Altinn.Platform.Storage.Repository;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Azure.Documents;
    using Microsoft.Extensions.Logging;
    using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

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
        /// Get all applications for a given application owner (org)
        /// </summary>
        /// <param name="org">application owner id</param>
        /// <returns>list of all applications for a given owner</returns>
        [HttpGet("{org}")]
        [ProducesResponseType(typeof(List<Application>), 200)]
        public async Task<ActionResult> GetMany(string org)
        {
            if (string.IsNullOrEmpty(org) || org.Contains("-") || org.Contains(" "))
            {
                return BadRequest($"Application owner id '{org}' is not valid");
            }
           
            try
            {
                List<Application> result = await repository.ListApplications(org);

                return Ok(result);
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    return NotFound($"Cannot find applications for application owner {org}");
                }

                logger.LogError($"Unable to access document database {dce}");
                return StatusCode(500, $"Unable to access document database {dce}");
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to perform query request {e}");
                return StatusCode(500, $"Unable to perform query request {e}");
            }
        }

        /// <summary>
        /// Gets one application
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns></returns>
        [HttpGet("{org}/{app}")]
        [ProducesResponseType(typeof(Application), 200)]
        public async Task<ActionResult> GetOne(string org, string app)
        {
            string appId = $"{org}/{app}";

            try
            {
                Application result = await repository.FindOne(appId, org);

                return Ok(result);
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    return NotFound($"Could not find an application with appId={appId}");
                }

                logger.LogError($"Unable to access document database: {dce}");
                return StatusCode(500, $"Unable to access document database: {dce}");
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to perform request: {e.Message}");
                return StatusCode(500, $"Unable to perform request: {e.Message}");
            }            
        }

        /// <summary>
        /// Inserts new application
        /// </summary>
        /// <param name="appId">the unique identification of the application to be created</param>
        /// <param name="application">the application metadata object to store</param>
        /// <returns>the applicaiton metadata object</returns>
        [HttpPost]
        [ProducesResponseType(typeof(Application), 201)]
        public async Task<ActionResult> Post(string appId, [FromBody] Application application)
        {
            if (!IsValidAppId(appId))
            {
                return BadRequest("AppId is not valid.");
            }

            string org = appId.Split("/")[0];

            try
            {
                await repository.FindOne(appId, org);

                return BadRequest("Application already exists in repository! Try update application instead. ");
            }
            catch (DocumentClientException e)
            {
                // repository throws exception if not found
                if (e.StatusCode != HttpStatusCode.NotFound)
                {
                    return StatusCode(500, $"Unable to access application collection: {e}");
                }
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to perform request: {e}");
                return StatusCode(500, $"Unable to perform request: {e}");
            }

            DateTime creationTime = DateTime.UtcNow;

            // make sure minimum application values are set
            application.Id = appId;
            application.Org = org;
            application.CreatedBy = GetUserId();
            application.Created = creationTime;
            application.LastChangedBy = GetUserId();
            application.LastChanged = creationTime;
            if (application.ValidFrom == null)
            {
                application.ValidFrom = creationTime;
            }

            if (application.DataTypes == null || application.DataTypes.Count == 0)
            {
                application.DataTypes = new List<DataType>();

                DataType form = new DataType()
                {
                    Id = "default",
                    AllowedContentTypes = new List<string>(),
                };
                form.AllowedContentTypes.Add("text/xml");
                form.AllowedContentTypes.Add("application/xml");

                application.DataTypes.Add(form);
            }

            try
            {
                Application result = await repository.Create(application);

                logger.LogInformation($"Application {appId} sucessfully stored", result);

                return Created(appId, result);
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to store application data in database. {e}");
                return StatusCode(500, $"Unable to store application data in database. {e}");
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

        /// <summary>
        /// Updates an application metadata object.
        /// </summary>
        /// <returns>the updated application metadata object</returns>
        [HttpPut("{org}/{app}")]
        [ProducesResponseType(typeof(Application), 200)]
        public async Task<ActionResult> Put(string org, string app, [FromBody] Application application)
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
            try
            {
                existingApplication = await repository.FindOne(appId, org);
            }
            catch (Exception e)
            {
                return NotFound($"Unable to find application with appId={appId} to update: {e}");
            }

            existingApplication.LastChangedBy = GetUserId();
            existingApplication.LastChanged = DateTime.UtcNow;

            existingApplication.VersionId = application.VersionId;
            existingApplication.ValidTo = application.ValidTo;
            existingApplication.ValidFrom = application.ValidFrom;
            existingApplication.Title = application.Title;
            existingApplication.ProcessId = application.ProcessId;
            existingApplication.MaxSize = application.MaxSize;
            existingApplication.DataTypes = application.DataTypes;
          
            existingApplication.PartyTypesAllowed = application.PartyTypesAllowed ?? new PartyTypesAllowed();

            try
            {
                Application result = await repository.Update(existingApplication);

                return Ok(result);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    return NotFound($"Did not find application with id={appId} to update");
                }

                logger.LogError($"Document database error: {dce}");
                return StatusCode(500, $"Document database error: {dce}");
            }
            catch (Exception exception) 
            {
                logger.LogError($"Unable to perform request: {exception}");
                return StatusCode(500, $"Unable to perform request: {exception}");
            }
        }

        /// <summary>
        /// Delete an application metadata object. Applications will not be deleted, but will be marked as deleted.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="hard">if true hard delete will take place</param>
        /// <returns>(200) updated application object, or no content if hard delete</returns>
        [HttpDelete("{org}/{app}")]
        [ProducesResponseType(typeof(Application), 202)]
        [ProducesResponseType(204)]
        public async Task<ActionResult> Delete(string org, string app, bool? hard)
        {
            string appId = $"{org}/{app}";
            string appOwnerId = org;

            try
            {
                Application application = await repository.FindOne(appId, appOwnerId);

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

                    return Accepted(softDeleteApplication);
                }
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    return NotFound($"Didn't find the object that should be deleted with appId={appId}");
                }

                logger.LogError($"Unable to reach document database {dce}");
                return StatusCode(500, $"Unable to reach document database {dce}");
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to perform request: {e}");
                return StatusCode(500, $"Unable to perform request: {e}");
            }
        }

        private string GetUserId()
        {
            return User?.Identity?.Name;
        }
    }
}
