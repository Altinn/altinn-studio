using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml.Serialization;
using AltinnCore.Common.Attributes;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Workflow;
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
        /// Method that fetches the users repo, zips it and sends the zip file to runtime
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <returns>The zipped file</returns>
        [HttpGet]
        public FileResult ZipAndSendRepo(string org, string service, string developer)
        {
            return File(_execution.ZipAndReturnFile(org, service, developer), "application/zip", $"{service}.zip");
        }

        /// <summary>
        /// Method that fetches the form model file from disk and sends it to runtime.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The form id</param>
        /// <returns>The form model</returns>
        [HttpGet]
        public FileResult GetFormModel(string org, string service, string developer, int partyId, Guid instanceId)
        {
            string testDataForParty = _settings.GetTestdataForPartyPath(org, service, developer);
            string formDataFilePath = $"{testDataForParty}{partyId}/{instanceId}/data/{instanceId}.xml";
            return File(_execution.GetFileStream(formDataFilePath), "application/xml", $"{instanceId}.xml");
        }

        /// <summary>
        /// Method that fetches the prefill file from disk and sends it to runtime.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="prefillkey">The key to the prefills</param>
        /// <returns>The prefill files</returns>
        [HttpGet]
        public FileResult GetPrefill(string org, string service, string developer, int partyId, string prefillkey)
        {
            string prefillFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/prefill/{prefillkey}.xml";
            return File(_execution.GetFileStream(prefillFilePath), "application/xml", $"{prefillkey}.xml");
        }

        /// <summary>
        /// Method that fetches the archived service model from disk and sends it to runtime.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The id of the instance</param>
        /// <returns>The archived service model</returns>
        [HttpGet]
        public FileResult GetArchivedServiceModel(string org, string service, string developer, int partyId, int instanceId)
        {
            string prefillFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/Archive/{instanceId}.xml";
            return File(_execution.GetFileStream(prefillFilePath), "application/xml", $"{instanceId}.xml");
        }

        /// <summary>
        /// Method that reads the testdata for party folder and returns a list of form instanses to runtime.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <returns>The list of service instances</returns>
        [HttpGet]
        public List<ServiceInstance> GetFormInstances(string org, string service, string developer, int partyId)
        {
            return _testdataSI.GetFormInstances(partyId, org, service, developer);
        }

        /// <summary>
        /// Method that reads the testdata for party prefill folder and returns a list of instanses to runtime.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <returns>The list of service prefills</returns>
        [HttpGet]
        public List<ServicePrefill> GetServicePrefill(string org, string service, string developer, int partyId)
        {
            return _testdataSI.GetServicePrefill(partyId, org, service, developer);
        }

        /// <summary>
        /// Method that receives the form model from runtime and saves it to designer disk.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId"> the form id</param>
        [HttpPost]
        public Guid SaveFormModel(string org, string service, string developer, int partyId, Guid instanceId)
        {
            //Guid dataId = Guid.NewGuid();
            //Guid dataId = instanceId;
            string dataPath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/data";

            if (!Directory.Exists(dataPath))
            {
                System.IO.Directory.CreateDirectory(dataPath);
            }

            string formDataFilePath = $"{dataPath}/{instanceId}.xml";
            _execution.SaveToFile(formDataFilePath, Request.Body);
            return instanceId;
        }

        /// <summary>
        /// Method that receives the form model from runtime and saves it to designer disk.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId"> the instance id</param>
        /// <param name="dataId"> the form id</param>
        [HttpPut]
        public void SaveFormModel(string org, string service, string developer, int partyId, Guid instanceId, Guid dataId)
        {
            string dataPath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/data";

            string formDataFilePath = $"{dataPath}/{dataId}.xml";
            _execution.SaveToFile(formDataFilePath, Request.Body);
        }

        /// <summary>
        /// Method that receives the form model from runtime and saves it to designer disk.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId"> the form id</param>
        [HttpPost]
        public void SaveInstanceToFile(string org, string service, string developer, int partyId, Guid instanceId)
        {
            string testDataForParty = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}";
            string folderForInstance = System.IO.Path.Combine(testDataForParty, instanceId.ToString());
            System.IO.Directory.CreateDirectory(folderForInstance);
            string instanceFilePath = $"{testDataForParty}/{instanceId}/{instanceId}.json";
            _execution.SaveToFile(instanceFilePath, Request.Body);
        }

        /// <summary>
        /// Method that gets the instance meta data from disk
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId"> the form id</param>
        [HttpGet]
        public FileResult GetInstanceFromFile(string org, string service, string developer, int partyId, Guid instanceId)
        {
            string testDataForParty = _settings.GetTestdataForPartyPath(org, service, developer);
            string formDataFilePath = $"{testDataForParty}{partyId}/{instanceId}/{instanceId}.json";
            return File(_execution.GetFileStream(formDataFilePath), "application/json", $"{instanceId}.json");
        }

        ///// <summary>
        ///// Method that receives the form model from runtime and saves it to designer disk.
        ///// </summary>
        ///// <param name="appInstance">the object</param>
        //[HttpPost]
        //public void SaveInstance(JObject appInstance)
        //{
        //    string formDataFilePath = $"{_settings.GetTestdataForPartyPath(appInstance.Property("org").ToString(), appInstance.Property("service").ToString(), appInstance.Property("developer").ToString())}{appInstance.Property("partyId").ToString()}/{appInstance.Property("instanceId").ToString()}.xml";
        //    _execution.SaveToFile(formDataFilePath, Request.Body);
        //}

        /// <summary>
        /// Method that receives the form attachment from runtime and saves it to designer disk.
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The instance id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="fileExtension">The name of the attachment</param>
        /// <returns>The status of the upload</returns>
        [HttpPost]
        [DisableFormValueModelBinding]
        public async System.Threading.Tasks.Task<IActionResult> SaveFormAttachment(string org, string service, string developer, int partyId, int instanceId, string attachmentType, string fileExtension)
        {
            Guid guid = Guid.NewGuid();
            string pathToSaveTo = _settings.GetTestdataForPartyPath(org, service, developer) + "{0}/{1}/data/{2}/{3}";
            Directory.CreateDirectory(string.Format(pathToSaveTo, partyId, instanceId, attachmentType, string.Empty));
            string fileToWriteTo = string.Format(pathToSaveTo, partyId, instanceId, attachmentType, guid.ToString() + fileExtension);
            using (Stream streamToWriteTo = System.IO.File.Open(fileToWriteTo, FileMode.OpenOrCreate))
            {
                await Request.StreamFile(streamToWriteTo);
                streamToWriteTo.Flush();
            }

            return Ok();
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
        /// Method that initializes the service state
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The form id</param>
        /// <returns>The state object</returns>
        [HttpGet]
        public ServiceState InitializeServiceState(string org, string service, string developer, int partyId, Guid instanceId)
        {
            string workflowFullFilePath = _settings.GetWorkflowPath(org, service, developer) + _settings.WorkflowFileName;
            string workflowData = System.IO.File.ReadAllText(workflowFullFilePath, Encoding.UTF8);
            Definitions workflowModel = null;

            XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
            using (TextReader tr = new StringReader(workflowData))
            {
                workflowModel = (Definitions)serializer.Deserialize(tr);
            }

            string nextStepName = string.Empty;
            SequenceFlow currentSequenceFlow = workflowModel.Process.SequenceFlow.Find(seq => seq.Id == workflowModel.Process.StartEvent.Outgoing);
            if (currentSequenceFlow != null)
            { 
                Task nextStepObj = workflowModel.Process.Task.Find(task => task.Id == currentSequenceFlow.TargetRef);
                if (nextStepObj != null)
                {
                    nextStepName = nextStepObj.Name;
                }
            }

            JObject stateJson = JObject.FromObject(new
            {
                state = nextStepName,
            });

            if (string.IsNullOrEmpty(nextStepName))
            {
                _logger.LogError("Unable to read workflowfile, unable to find next step name from start event");
            }
                
            string stateFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/{instanceId}.state.json";
            System.IO.File.WriteAllText(stateFilePath, stateJson.ToString(), Encoding.UTF8);

            return new ServiceState()
            {
                State = string.IsNullOrEmpty(nextStepName) ?
                WorkflowStep.Unknown
                : (WorkflowStep)Enum.Parse(typeof(WorkflowStep), nextStepName, true),
            };
        }

        /// <summary>
        /// Method that updates the current state of the service
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The current developer</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <param name="instanceId">The form id</param>
        /// <returns>The new current state </returns>
        [HttpGet]
        public ServiceState UpdateCurrentState(string org, string service, string developer, int partyId, Guid instanceId)
        {
            string workflowFullFilePath = _settings.GetWorkflowPath(org, service, developer) + _settings.WorkflowFileName;
            string workflowData = System.IO.File.ReadAllText(workflowFullFilePath, Encoding.UTF8);
            string serviceStatePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/{instanceId}.state.json";
            string currentStateAsString = System.IO.File.ReadAllText(serviceStatePath, Encoding.UTF8);
            ServiceState currentState = JsonConvert.DeserializeObject<ServiceState>(currentStateAsString);
            Definitions workflowModel = null;

            XmlSerializer serializer = new XmlSerializer(typeof(Definitions));
            using (TextReader tr = new StringReader(workflowData))
            {
                workflowModel = (Definitions)serializer.Deserialize(tr);
            }

            string nextStepName = string.Empty;
            Task currentTask = workflowModel.Process.Task.Find(task => task.Name == currentState.State.ToString());
            if (currentTask != null)
            {
                SequenceFlow currentSequenceFlow = workflowModel.Process.SequenceFlow.Find(seq => seq.SourceRef == currentTask.Id);
                if (currentSequenceFlow != null)
                {
                    Task nextStepObj = workflowModel.Process.Task.Find(task => task.Id == currentSequenceFlow.TargetRef);
                    if (nextStepObj != null)
                    {
                        nextStepName = nextStepObj.Name;
                    }
                    else if (workflowModel.Process.EndEvent.Id == currentSequenceFlow.TargetRef)
                    {
                        nextStepName = WorkflowStep.Archived.ToString();
                    }
                }
            }

            JObject stateJson = JObject.FromObject(new
            {
                state = nextStepName,
            });

            if (string.IsNullOrEmpty(nextStepName))
            {
                _logger.LogError("Unable to read workflowfile, unable to find next step name from current step");
            }

            System.IO.File.WriteAllText(serviceStatePath, stateJson.ToString(), Encoding.UTF8);

            return new ServiceState()
            {
                State = string.IsNullOrEmpty(nextStepName) ?
                WorkflowStep.Unknown
                : (WorkflowStep)Enum.Parse(typeof(WorkflowStep), nextStepName, true),
            };
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
            string serviceStatePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{instanceId}/{instanceId}.state.json";
            string currentStateAsString = System.IO.File.ReadAllText(serviceStatePath, Encoding.UTF8);
            return JsonConvert.DeserializeObject<ServiceState>(currentStateAsString);
        }
    }
}
