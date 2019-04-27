using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml.Serialization;
using AltinnCore.Common.Attributes;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for file sharing between designer and runtime
    /// </summary>
    [Authorize]
    public class RuntimeAPIController : Controller
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IExecution _execution;
        private readonly ITestdata _testdataSI;
        private readonly ILogger _logger;
        private const string FORM_ID = "default";

        /// <summary>
        /// Initializes a new instance of the <see cref="RuntimeAPIController"/> class.
        /// </summary>
        /// <param name="repositorySettings">The repository settings</param>
        /// <param name="executionSI">The executionSI</param>
        /// <param name="testdataSIDesigner">The testdataSI for the designer</param>
        /// <param name="logger">The logger</param>
        public RuntimeAPIController(IOptions<ServiceRepositorySettings> repositorySettings, IExecution executionSI, ITestdata testdataSIDesigner, ILogger<RuntimeAPIController> logger)
        {
            _settings = repositorySettings.Value;
            _execution = executionSI;
            _testdataSI = testdataSIDesigner;
            _logger = logger;
        }

        /// <summary>
        /// Method that receives the form attachment from runtime and saves it to designer disk.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The instance id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentName">The name of the attachment</param>
        /// <returns>The status of the upload and guid of attachment</returns>
        [HttpPost]
        [DisableFormValueModelBinding]
        public async System.Threading.Tasks.Task<IActionResult> SaveFormAttachment(string org, string service, string developer, int partyId, Guid instanceId, string attachmentType, string attachmentName)
        {
            Guid guid = Guid.NewGuid();
            string pathToSaveTo = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/data/{attachmentType}/{guid}/";
            Directory.CreateDirectory(pathToSaveTo);
            string fileToWriteTo = $"{pathToSaveTo}/{attachmentName}";
            using (Stream streamToWriteTo = System.IO.File.Open(fileToWriteTo, FileMode.OpenOrCreate))
            {
                await Request.StreamFile(streamToWriteTo);
                streamToWriteTo.Flush();
            }

            return Ok(new { id = guid });
        }

        /// <summary>
        /// Method that removes a form attachment from designer disk
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The instance id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentId">The attachment id</param>
        /// <returns>The status of the deletion</returns>
        [HttpPost]
        [DisableFormValueModelBinding]
        public IActionResult DeleteFormAttachment(string org, string service, string developer, int partyId, Guid instanceId, string attachmentType, string attachmentId)
        {
            string pathToDelete = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/data/{attachmentType}/{attachmentId}";
            DirectoryInfo directory = new DirectoryInfo(pathToDelete);
            foreach (FileInfo file in directory.EnumerateFiles())
            {
                file.Delete();
            }

            directory.Delete();
            return Ok();
        }

        /// <summary>
        /// Method that gets metadata on form attachments form designer disk
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The instance id</param>
        /// <returns>A list with attachments metadata ordered by attachmentType</returns>
        [HttpGet]
        [DisableFormValueModelBinding]
        public IActionResult GetFormAttachments(string org, string service, string developer, int partyId, Guid instanceId)
        {
            string attachmentsPath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/data/";
            DirectoryInfo rootDirectory = new DirectoryInfo(attachmentsPath);
            List<AttachmentList> allAttachments = new List<AttachmentList>();
            foreach (DirectoryInfo typeDirectory in rootDirectory.EnumerateDirectories())
            {
                List<Attachment> attachments = new List<Attachment>();
                foreach (DirectoryInfo fileDirectory in typeDirectory.EnumerateDirectories())
                {
                    foreach (FileInfo file in fileDirectory.EnumerateFiles())
                    {
                        attachments.Add(new Attachment { Name = file.Name, Id = fileDirectory.Name, Size = file.Length });
                    }
                }

                if (attachments.Count > 0)
                {
                    allAttachments.Add(new AttachmentList { Type = typeDirectory.Name, Attachments = attachments });
                }
            }

            return Ok(allAttachments);
        }

        /// <summary>
        /// Method that receives the archived service model from runtime and saves it to designer disk.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The instance id</param>
        [HttpPost]
        public void ArchiveServiceModel(string org, string service, string developer, int partyId, Guid instanceId)
        {
            string archiveDirectory = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/Archive/";
            if (!Directory.Exists(archiveDirectory))
            {
                Directory.CreateDirectory(archiveDirectory);
            }

            string formDataFilePath = $"{archiveDirectory}{instanceId}.xml";
            _execution.SaveToFile(formDataFilePath, Request.Body);
        }

        /// <summary>
        /// Method that gets the current service state
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The form id</param>
        /// <returns>The current state object</returns>
        [HttpGet]
        public ServiceState GetCurrentState(string org, string service, string developer, int partyId, Guid instanceId)
        {
            string serviceStatePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/{instanceId}.json";
            string currentStateAsString = System.IO.File.ReadAllText(serviceStatePath, Encoding.UTF8);
            Instance instance = JsonConvert.DeserializeObject<Instance>(currentStateAsString);
            Enum.TryParse<WorkflowStep>(instance.CurrentWorkflowStep, out WorkflowStep current);
            return new ServiceState
            {
                State = current,
            };
        }
    }
}
