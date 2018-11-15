using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using AltinnCore.Common.Configuration;
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

        /// <summary>
        /// Initializes a new instance of the <see cref="RuntimeAPIController"/> class.
        /// </summary>
        /// <param name="repositorySettings">The repository settings</param>
        public RuntimeAPIController(IOptions<ServiceRepositorySettings> repositorySettings)
        {
            _settings = repositorySettings.Value;
        }

        /// <summary>
        /// Method that fetches the users repo, zips it and sends it to runtime.
        /// </summary>
        [HttpGet]
        public FileResult ZipAndSendRepo(string org, string service, string developer)
        {
            string startPath = _settings.GetServicePath(org, service, developer);
            string zipPath = $"{_settings.GetOrgPath(org, developer)}{service}.zip";
            if (System.IO.File.Exists(zipPath))
            {
                System.IO.File.Delete(zipPath);
            }

            ZipFile.CreateFromDirectory(startPath, zipPath);
            FileStream fileToSend = System.IO.File.Open(zipPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);

            return File(fileToSend, "application/zip", $"{service}{Path.GetExtension(zipPath)}");
        }

        /// <summary>
        /// Method that fetches the form model file from disk and sends it to runtime.
        /// </summary>
        [HttpGet]
        public FileResult GetFormModel(string org, string service, string developer, int partyId, int formID)
        {
            string formDataFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{formID}.xml";
            FileStream fileToSend = System.IO.File.Open(formDataFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return File(fileToSend, "application/xml", $"{formID}.xml");
        }

        /// <summary>
        /// Method that fetches the prefill file from disk and sends it to runtime.
        /// </summary>
        [HttpGet]
        public FileResult GetPrefill(string org, string service, string developer, int partyId, string prefillkey)
        {
            string PrefillFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/prefill/{prefillkey}.xml";
            FileStream fileToSend = System.IO.File.Open(PrefillFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return File(fileToSend, "application/xml", $"{prefillkey}.xml");
        }

        /// <summary>
        /// Method that fetches the archived service model from disk and sends it to runtime.
        /// </summary>
        [HttpGet]
        public FileResult GetArchivedServiceModel(string org, string service, string developer, int partyId, int instanceId)
        {
            string PrefillFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/Archive/{instanceId}.xml";
            FileStream fileToSend = System.IO.File.Open(PrefillFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return File(fileToSend, "application/xml", $"{instanceId}.xml");
        }

        /// <summary>
        /// Method that reads the testdata for party folder and returns a list of form instanses to runtime.
        /// </summary>
        [HttpGet]
        public List<ServiceInstance> GetFormInstances(string org, string service, string developer, int partyId)
        {
            List<ServiceInstance> formInstances = new List<ServiceInstance>();
            string formDataFilePath = _settings.GetTestdataForPartyPath(org, service, developer) + partyId;
            string archiveFolderPath = $"{formDataFilePath}/Archive/";

            if (!Directory.Exists(archiveFolderPath))
            {
                Directory.CreateDirectory(archiveFolderPath);
            }

            string[] files = Directory.GetFiles(formDataFilePath);
            foreach (string file in files)
            {
                if (int.TryParse(Path.GetFileNameWithoutExtension(file), out int instanceId))
                {
                    ServiceInstance serviceInstance = new ServiceInstance()
                    {
                        ServiceInstanceID = instanceId,
                        LastChanged = System.IO.File.GetLastWriteTime(file)
                    };

                    string archiveFilePath = archiveFolderPath + "/" + serviceInstance.ServiceInstanceID + ".xml";
                    if (System.IO.File.Exists(archiveFilePath))
                    {
                        serviceInstance.LastChanged = System.IO.File.GetLastWriteTime(archiveFilePath);
                        serviceInstance.IsArchived = true;
                    }

                    formInstances.Add(serviceInstance);
                }
            }

            return formInstances;
        }

        /// <summary>
        /// Method that reads the testdata for party prefill folder and returns a list of instanses to runtime.
        /// </summary>
        [HttpGet]
        public List<ServicePrefill> GetServicePrefill(string org, string service, string developer, int partyId)
        {
            List<ServicePrefill> formInstances = new List<ServicePrefill>();
            string formDataFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/Prefill/";
            if (!Directory.Exists(formDataFilePath))
            {
                Directory.CreateDirectory(formDataFilePath);
            }

            string[] files = Directory.GetFiles(formDataFilePath);
            foreach (string file in files)
            {
                formInstances.Add(new ServicePrefill() { PrefillKey = Path.GetFileNameWithoutExtension(file), LastChanged = System.IO.File.GetLastWriteTime(file) });
            }

            return formInstances;
        }

        /// <summary>
        /// Method that receives the form model from runtime and saves it to designer disk.
        /// </summary>
        [HttpPost]
        public void SaveFormModel(string org, string service, string developer, int partyId, int formId)
        {
            string formDataFilePath = $"{_settings.GetTestdataForPartyPath(org, service, developer)}{partyId}/{formId}.xml";
            using (Stream stream = System.IO.File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
            {
                Request.Body.CopyTo(stream);
            }
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

            string formDataFilePath = archiveDirectory + instanceId + ".xml";
            using (Stream stream = System.IO.File.Open(formDataFilePath, FileMode.Create, FileAccess.ReadWrite))
            {
                Request.Body.CopyTo(stream);
            }
        }
    }
}
