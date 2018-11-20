using System.Collections.Generic;
using System.IO;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller for file sharing between designer and runtime
    /// </summary>
    public class RuntimeAPIController : Controller
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IExecution _execution;
        private readonly ITestdata _testdataSI;

        /// <summary>
        /// Initializes a new instance of the <see cref="RuntimeAPIController"/> class.
        /// </summary>
        /// <param name="repositorySettings">The repository settings</param>
        public RuntimeAPIController(IOptions<ServiceRepositorySettings> repositorySettings, IExecution executionSI, ITestdata testdataSIDesigner)
        {
            _settings = repositorySettings.Value;
            _execution = executionSI;
            _testdataSI = testdataSIDesigner;
        }

        /// <summary>
        /// Method that fetches the users repo, zips it and sends it to runtime.
        /// </summary>
        [HttpGet]
        public FileResult ZipAndSendRepo(string org, string service, string developer)
        {
            return File(_execution.ZipAndReturnFile(org, service, developer), "application/zip", $"{service}.zip");
        }

        /// <summary>
        /// Method that fetches the form model file from disk and sends it to runtime.
        /// </summary>
        [HttpGet]
        public FileResult GetFormModel(string org, string service, string developer, int partyId, int formID)
        {
            string formDataFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{formID}.xml";
            return File(_execution.GetFileStream(formDataFilePath), "application/xml", $"{formID}.xml");
        }

        /// <summary>
        /// Method that fetches the prefill file from disk and sends it to runtime.
        /// </summary>
        [HttpGet]
        public FileResult GetPrefill(string org, string service, string developer, int partyId, string prefillkey)
        {
            string prefillFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/prefill/{prefillkey}.xml";
            return File(_execution.GetFileStream(prefillFilePath), "application/xml", $"{prefillkey}.xml");
        }

        /// <summary>
        /// Method that fetches the archived service model from disk and sends it to runtime.
        /// </summary>
        [HttpGet]
        public FileResult GetArchivedServiceModel(string org, string service, string developer, int partyId, int instanceId)
        {
            string prefillFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/Archive/{instanceId}.xml";
            return File(_execution.GetFileStream(prefillFilePath), "application/xml", $"{instanceId}.xml");
        }

        /// <summary>
        /// Method that reads the testdata for party folder and returns a list of form instanses to runtime.
        /// </summary>
        [HttpGet]
        public List<ServiceInstance> GetFormInstances(string org, string service, string developer, int partyId)
        {
            return _testdataSI.GetFormInstances(partyId, org, service, developer);
        }

        /// <summary>
        /// Method that reads the testdata for party prefill folder and returns a list of instanses to runtime.
        /// </summary>
        [HttpGet]
        public List<ServicePrefill> GetServicePrefill(string org, string service, string developer, int partyId)
        {
            return _testdataSI.GetServicePrefill(partyId, org, service, developer);
        }

        /// <summary>
        /// Method that receives the form model from runtime and saves it to designer disk.
        /// </summary>
        [HttpPost]
        public void SaveFormModel(string org, string service, string developer, int partyId, int formId)
        {
            string formDataFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{formId}.xml";
            _execution.SaveToFile(formDataFilePath, Request.Body);
        }

        /// <summary>
        /// Method that receives the archived service model from runtime and saves it to designer disk.
        /// </summary>
        [HttpPost]
        public void ArchiveServiceModel(string org, string service, string developer, int partyId, int instanceId)
        {
            string archiveDirectory = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/Archive/";
            if (!Directory.Exists(archiveDirectory))
            {
                Directory.CreateDirectory(archiveDirectory);
            }

            string formDataFilePath = $"{archiveDirectory}{instanceId}.xml";
            _execution.SaveToFile(formDataFilePath, Request.Body);
        }
    }
}
