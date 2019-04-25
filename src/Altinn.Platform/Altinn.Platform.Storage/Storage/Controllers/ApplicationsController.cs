using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Documents;
using Serilog;
using Serilog.Core;

namespace Altinn.Platform.Storage.Controllers
{
    /// <summary>
    /// a summary is needed here
    /// </summary>
    [Route("api/storage/v1/[controller]")]
    public class ApplicationsController : Controller
    {
        private readonly IApplicationRepository repository;
        private Logger logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationsController"/> class
        /// </summary>
        /// <param name="instanceRepository">the instance repository handler</param>
        public ApplicationsController(IApplicationRepository instanceRepository)
        {
            repository = instanceRepository;
        }

        /// <summary>
        /// Get all applications for a given application owner
        /// </summary>
        /// <param name="applicationOwnerId">application owner id</param>
        /// <returns>list of all applications for a given owner</returns>        
        [HttpGet]
        public async Task<ActionResult> GetMany(string applicationOwnerId)
        {            
            if (!string.IsNullOrEmpty(applicationOwnerId))
            {
                List<ApplicationMetadata> result = await repository.ListApplications(applicationOwnerId);
                if (result == null || result.Count == 0)
                {
                    return NotFound($"Did not find any applications for applicationOwnerId={applicationOwnerId}");
                }

                return Ok(result);
            }

            return BadRequest("Unable to perform query");
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
                if (result == null)
                {
                    return NotFound("Did not find an instance with instanceId=" + applicationId);
                }

                return Ok(result);
            }
            catch (Exception e)
            {
                return StatusCode(500, "Could not connect to database. " + e.Message);
            }
            
        }

        /// <summary>
        /// Inserts new application
        /// </summary>
        /// <param name="applicationId">the applicationid</param>
        /// <param name="application">the application metadata object to store</param>
        /// <returns>instance object</returns>
        [HttpPost]        
        public async Task<ActionResult> Post(string applicationId, [FromBody] ApplicationMetadata application)
        {
            if (string.IsNullOrEmpty(applicationId))
            {
                return BadRequest("Missing parameter value: applicationId must be set");
            }

            string applicationOwnerId = GetApplicationOwner(applicationId);

            try
            {
                ApplicationMetadata existingApplication = await repository.FindOne(applicationId, applicationOwnerId);

                return BadRequest("Application already exists in repsitory! Try update application instead. ");
            }
            catch (DocumentClientException e)
            {
                // repository throws exception if not found
            }            

            DateTime creationTime = DateTime.UtcNow;

            // make sure minimum application values are set
            application.Id = applicationId;
            application.ApplicationOwnerId = applicationOwnerId;
            application.CreatedBy = User.Identity.Name;
            application.CreatedDateTime = creationTime;
            application.LastChangedBy = User.Identity.Name;

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

                logger.Information($"Application {applicationId} sucessfully stored", application);

                return Ok(result);
            }
            catch (Exception e)
            {
                return StatusCode(500, "Unable to store application data in database. Error " + e.Message);
            }
        }

        private string GetApplicationOwner(string applicationId)
        {
            string[] parts = applicationId.Split("-");

            if (parts.Length > 1)
            {
                return parts[0];
            }

            return "TEST";
        }

        /// <summary>
        /// Updates an instance
        /// </summary>
        /// <returns></returns>
        [HttpPut("{applicationId}")]
        public async Task<ActionResult> Put(string applicationId, [FromBody] ApplicationMetadata instance)
        {
            instance.LastChangedBy = User.Identity.Name;
            instance.LastChangedDateTime = DateTime.UtcNow;

            try
            {
                ApplicationMetadata result = await repository.Update(instance);                

                return Ok(result);
            }
            catch (Exception e) 
            {
                return StatusCode(500, "Couldn't update application. " + e.Message);
            }
        }

        /// <summary>
        /// Delete an instance
        /// </summary>
        /// <param name="applicationId">an application owner id</param>
        /// <param name="hard">if true hard delete will take place</param>
        /// <returns>updated instance object</returns>
        [HttpDelete("{applicationId}")]
        public async Task<ActionResult> Delete(string applicationId, bool? hard)
        {
            string applicationOwnerId = GetApplicationOwner(applicationId);

            ApplicationMetadata instance = await repository.FindOne(applicationId, applicationOwnerId);
            if (instance == null)
            {
                return NotFound($"Didn't find the object that should be deleted with applicationId={applicationId}");
            }
            else
            {
                if (hard.HasValue && hard == true)
                {
                    bool deletedOK = await repository.Delete(applicationId, applicationOwnerId);
                    if (deletedOK)
                    {
                        return Ok(true);
                    }                    
                }
                else
                {
                    DateTime timestamp = DateTime.UtcNow;

                    instance.LastChangedBy = User.Identity.Name;
                    instance.LastChangedDateTime = timestamp;
                    instance.ValidTo = timestamp;

                    ApplicationMetadata result = await repository.Update(instance);
                    if (result != null)
                    {
                        return Ok(result);
                    }                            
                }

                return BadRequest();
            }
        }
    }
}
