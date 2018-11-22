using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Services with functionality for test data under service development
    /// </summary>
    public class TestdataSIDesigner : ITestdata
    {
        private const string TESTUSERS_FILENAME = "testusers.json";

        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly ServiceRepositorySettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="TestdataSIDesigner"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="repositorySettings">Service repository settings</param>
        public TestdataSIDesigner(IOptions<TestdataRepositorySettings> testdataRepositorySettings, IOptions<ServiceRepositorySettings> repositorySettings)
        {
            this._testdataRepositorySettings = testdataRepositorySettings.Value;
            this._settings = repositorySettings.Value;
        }

        /// <summary>
        /// Creates a list of form instances stored on disk for a given partyId and serviceId
        /// </summary>
        /// <param name="partyId">The partyId</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">The developer for the current service if any</param>
        /// <returns>The service instance list</returns>
        public List<ServiceInstance> GetFormInstances(int partyId, string org, string service, string developer = null)
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
                        LastChanged = File.GetLastWriteTime(file),
                    };

                    string archiveFilePath = archiveFolderPath + "/" + serviceInstance.ServiceInstanceID + ".xml";
                    if (File.Exists(archiveFilePath))
                    {
                        serviceInstance.LastChanged = File.GetLastWriteTime(archiveFilePath);
                        serviceInstance.IsArchived = true;
                    }

                    formInstances.Add(serviceInstance);
                }
            }

            return formInstances;
        }

        /// <summary>
        /// Return a list of test users
        /// </summary>
        /// <returns>Test users</returns>
        public List<Testdata> GetTestUsers()
        {
            string path = _testdataRepositorySettings.RepositoryLocation + @"/" + TESTUSERS_FILENAME;
            string textData = File.ReadAllText(path, Encoding.UTF8);
            List<Testdata> testUser = JsonConvert.DeserializeObject<List<Testdata>>(textData);
            return testUser;
        }

        /// <summary>
        /// Returns a list of prefill instances for a given party and service
        /// </summary>
        /// <param name="partyId">The partyId</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">The developer for the current service if any</param>
        /// <returns>A list of prefill to be used</returns>
        public List<ServicePrefill> GetServicePrefill(int partyId, string org, string service, string developer = null)
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
                formInstances.Add(
                    new ServicePrefill()
                    {
                        PrefillKey = Path.GetFileNameWithoutExtension(file),
                        LastChanged = File.GetLastWriteTime(file),
                    });
            }

            return formInstances;
        }
    }
}
