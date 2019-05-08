using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// Provides operations for handling application metadata
    /// </summary>
    [Route("storage/api/v1/applications")]
    [ApiController]
    public class ApplicationsController : Controller
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
        /// Get all applications for a given application owner
        /// </summary>
        /// <param name="applicationOwnerId">application owner id</param>
        /// <returns>list of all applications for a given owner</returns>        
        [HttpGet]
        public async Task<ActionResult> GetMany(string applicationOwnerId)
        {            
            if (string.IsNullOrEmpty(applicationOwnerId))
            {
                return BadRequest("Query parameter applicationOwnerId cannot be empty or null");
            }

            try
            {
                List<ApplicationMetadata> result = await repository.ListApplications(applicationOwnerId);

                return Ok(result);
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    return NotFound($"Cannot find applications for application owner {applicationOwnerId}");
                }

                logger.LogError($"Unable to access document database {dce.Message}");
                return StatusCode(500, $"Unable to access document database {dce.Message}");
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
        /// <returns></returns>
        [HttpGet("{applicationId}")]
        public async Task<ActionResult> GetOne(string applicationId)
        {
            string applicationOwnerId = GetApplicationOwner(applicationId);

            try
            {
                ApplicationMetadata result = await repository.FindOne(applicationId, applicationOwnerId);

                return Ok(result);
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    return NotFound($"Could not find an application to update with applicationId={applicationId} . You first have to create one");
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
        /// <param name="applicationId">the applicationid</param>
        /// <param name="application">the application metadata object to store</param>
        /// <returns>the applicaiton metadata object</returns>
        [HttpPost]        
        public async Task<ActionResult> Post(string applicationId, [FromBody] ApplicationMetadata application)
        {
            if (string.IsNullOrEmpty(applicationId))
            {
                return BadRequest("Missing parameter value: applicationId must be set");
            }

            string applicationOwnerId;
            try
            {
                applicationOwnerId = GetApplicationOwner(applicationId);
            }
            catch (Exception e)
            {
                return BadRequest($"Illegal applicationId: {e.Message}");
            }

            try
            {
                ApplicationMetadata existingApplication = await repository.FindOne(applicationId, applicationOwnerId);

                return BadRequest("Application already exists in repsitory! Try update application instead. ");
            }
            catch (DocumentClientException e)
            {
                // repository throws exception if not found
                if (e.StatusCode != HttpStatusCode.NotFound)
                {
                    return StatusCode(500, "Unable to access application collection: " + e.Message);
                }                
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to perform request: {e}");
                return StatusCode(500, $"Unable to perform request: {e}");
            }

            DateTime creationTime = DateTime.UtcNow;

            // make sure minimum application values are set
            application.Id = applicationId;
            application.ApplicationOwnerId = applicationOwnerId;
            application.CreatedBy = User.Identity.Name;
            application.CreatedDateTime = creationTime;
            application.LastChangedBy = User.Identity.Name;
            application.LastChangedDateTime = creationTime;
            if (application.ValidFrom == null)
            {
                application.ValidFrom = creationTime;
            }

            if (application.Forms == null || application.Forms.Count == 0)
            {
                application.Forms = new List<ApplicationForm>();

                ApplicationForm form = new ApplicationForm()
                {
                    Id = "default",
                    AllowedContentType = new List<string>(),
                };
                form.AllowedContentType.Add("text/xml");
                form.AllowedContentType.Add("application/xml");

                application.Forms.Add(form);
            }

            try
            {
                ApplicationMetadata result = await repository.Create(application);

                logger.LogInformation($"Application {applicationId} sucessfully stored", application);

                return Ok(result);
            }
            catch (Exception e)
            {
                logger.LogError($"Unable to store application data in database. {e}");
                return StatusCode(500, $"Unable to store application data in database. {e}");
            }
        }

        private string GetApplicationOwner(string applicationId)
        {
            if (applicationId == null || applicationId.Contains("/"))
            {
                throw new ApplicationException("ApplicationId cannot be null or contain forward slash /");
            }

            string[] parts = applicationId.Split("-");

            if (parts.Length > 1)
            {
                return parts[0];
            }

            throw new ApplicationException("Cannot get application Owner Id from applicationId: {applicationId}");
        }

        /// <summary>
        /// Updates an application
        /// </summary>
        /// <returns>the updated application metadata object</returns>
        [HttpPut("{applicationId}")]
        public async Task<ActionResult> Put(string applicationId, [FromBody] ApplicationMetadata application)
        {
            string applicationOwnerId = GetApplicationOwner(applicationId);
            ApplicationMetadata existingApplication;

            try
            {
                existingApplication = await repository.FindOne(applicationId, application.ApplicationOwnerId);
            }
            catch (Exception e) 
            {
                return NotFound($"Unable to find application with applicationId={applicationId} for applicationOwnerId={applicationOwnerId} for update: {e.Message}");
            }

            if (application == null)
            {
                return BadRequest("Missing application metadata object. Please attach one.");
            }

            if (application.Id == null || !application.Id.Equals(applicationId))
            {
                return BadRequest("applicationId in path does not match id in attached object");
            }

            if (application.ApplicationOwnerId == null || !application.ApplicationOwnerId.Equals(applicationOwnerId))
            {
                return BadRequest("ApplicationOwnerId from applicationId is not matching attached object");
            }

            application.LastChangedBy = User.Identity.Name;
            application.LastChangedDateTime = DateTime.UtcNow;

            // Make sure client has not updated any important fields
            application.CreatedBy = existingApplication.CreatedBy;
            application.CreatedDateTime = existingApplication.CreatedDateTime;

            try
            {
                ApplicationMetadata result = await repository.Update(application);                

                return Ok(result);
            }
            catch (DocumentClientException dce)
            {
                if (dce.Error.Code.Equals("NotFound"))
                {
                    return NotFound($"Did not find application with id={applicationId} to update");
                }

                logger.LogError($"Document database error: {dce.Message}");
                return StatusCode(500, $"Document database error: {dce.Message}");
            }
            catch (Exception e) 
            {
                logger.LogError($"Unable to perform request: {e.Message}");
                return StatusCode(500, $"Unable to perform request: {e.Message}");
            }
        }

        /// <summary>
        /// Delete an application
        /// </summary>
        /// <param name="applicationId">an application id</param>
        /// <param name="hard">if true hard delete will take place</param>
        /// <returns>updated application object</returns>
        [HttpDelete("{applicationId}")]
        public async Task<ActionResult> Delete(string applicationId, bool? hard)
        {
            string applicationOwnerId;
            try
            {
                applicationOwnerId = GetApplicationOwner(applicationId);
            }
            catch (Exception e)
            {
                return BadRequest($"Illegal applicationId: {e.Message}");
            }

            try
            {
                ApplicationMetadata application = await repository.FindOne(applicationId, applicationOwnerId);

                if (hard.HasValue && hard == true)
                {
                    bool deletedOK = await repository.Delete(applicationId, applicationOwnerId);

                    return Ok(application);
                }
                else
                {
                    DateTime timestamp = DateTime.UtcNow;

                    application.LastChangedBy = User.Identity.Name;
                    application.LastChangedDateTime = timestamp;
                    application.ValidTo = timestamp;

                    ApplicationMetadata softDeleteApplication = await repository.Update(application);

                    return Ok(softDeleteApplication);                    
                }
            }
            catch (DocumentClientException dce)
            {
                if (dce.StatusCode == HttpStatusCode.NotFound)
                {
                    return NotFound($"Didn't find the object that should be deleted with applicationId={applicationId}");
                }

                logger.LogError($"Unable to reach document database {dce}");
                return StatusCode(500, $"Unable to reach document database {dce}");
            }            
            catch (Exception e)
            {
                logger.LogError($"Unable to perform request: {e.Message}");
                return StatusCode(500, $"Unable to perform request: {e.Message}");
            }
        }
    }
}
