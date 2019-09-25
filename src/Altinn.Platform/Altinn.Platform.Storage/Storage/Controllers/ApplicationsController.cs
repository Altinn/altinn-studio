namespace Altinn.Platform.Storage.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.Net;
    using System.Text.RegularExpressions;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Helpers;
    using Altinn.Platform.Storage.Models;
    using Altinn.Platform.Storage.Repository;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Azure.Documents;
    using Microsoft.Extensions.Logging;

    /// <summary>
    /// Provides operations for handling application metadata
    /// </summary>
    [Route("storage/api/v1/applications")]
    [ApiController]
    public class ApplicationsController : ControllerBase
    {
        private readonly IApplicationRepository repository;
        private ILogger logger;

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
        /// <param name="org">application owner id</param>
        /// <param name="app">application name</param>
        /// <returns></returns>
        [HttpGet("{org}/{app}")]
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
            application.CreatedBy = User.Identity.Name;
            application.CreatedDateTime = creationTime;
            application.LastChangedBy = User.Identity.Name;
            application.LastChangedDateTime = creationTime;
            if (application.ValidFrom == null)
            {
                application.ValidFrom = creationTime;
            }

            if (application.ElementTypes == null || application.ElementTypes.Count == 0)
            {
                application.ElementTypes = new List<ElementType>();

                ElementType form = new ElementType()
                {
                    Id = "default",
                    AllowedContentType = new List<string>(),
                };
                form.AllowedContentType.Add("text/xml");
                form.AllowedContentType.Add("application/xml");

                application.ElementTypes.Add(form);
            }

            try
            {
                Application result = await repository.Create(application);

                logger.LogInformation($"Application {appId} sucessfully stored", result);

                return Ok(result);
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

            string appNamePattern = @"^[a-zæøå][a-zæøå0-9\-]*$";
            if (!Regex.IsMatch(parts[1], appNamePattern))
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Updates an application
        /// </summary>
        /// <returns>the updated application metadata object</returns>
        [HttpPut("{org}/{app}")]
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

            existingApplication.LastChangedBy = User.Identity.Name;
            existingApplication.LastChangedDateTime = DateTime.UtcNow;

            existingApplication.VersionId = application.VersionId;
            existingApplication.ValidTo = application.ValidTo;
            existingApplication.ValidFrom = application.ValidFrom;
            existingApplication.Title = application.Title;
            existingApplication.WorkflowId = application.WorkflowId;
            existingApplication.MaxSize = application.MaxSize;
            existingApplication.ElementTypes = application.ElementTypes;
            if (existingApplication.PartyTypesAllowed == null)
            {
                existingApplication.PartyTypesAllowed = new PartyTypesAllowed();
            }

            existingApplication.PartyTypesAllowed = application.PartyTypesAllowed;

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
        /// Delete an application
        /// </summary>
        /// <param name="org">the organisation owning the app</param>
        /// <param name="app">application name</param>
        /// <param name="hard">if true hard delete will take place</param>
        /// <returns>updated application object</returns>
        [HttpDelete("{org}/{app}")]
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

                    application.LastChangedBy = User.Identity.Name;
                    application.LastChangedDateTime = timestamp;
                    application.ValidTo = timestamp;

                    Application softDeleteApplication = await repository.Update(application);

                    return Ok(softDeleteApplication);
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
    }
}
