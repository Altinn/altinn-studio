using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Services with functionality for test data under service development
    /// </summary>
    public class TestdataStudioSI : ITestdata
    {
        private const string TESTUSERS_FILENAME = "testusers.json";

        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TestdataStudioSI"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="repositorySettings">Service repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="logger">the logger</param>
        public TestdataStudioSI(IOptions<TestdataRepositorySettings> testdataRepositorySettings, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, ILogger<TestdataStudioSI> logger)
        {
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        /// <inheritdoc />
        public List<ServiceInstance> GetFormInstances(int instanceOwnerId, string applicationOwnerId, string applicationId, string developer = null)
        {
            List<ServiceInstance> formInstances = new List<ServiceInstance>();
            string instancesPath = $"{_settings.GetTestdataForPartyPath(applicationOwnerId, applicationId, developer)}{instanceOwnerId}";
            string archiveFolderPath = $"{instancesPath}/Archive/";
            if (!Directory.Exists(archiveFolderPath))
            {
                Directory.CreateDirectory(archiveFolderPath);
            }

            string[] files = Directory.GetDirectories(instancesPath);
            foreach (string file in files)
            {
                string instance = new DirectoryInfo(file).Name;

                if (Guid.TryParse(instance, out Guid instanceId))
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

        /// <inheritdoc />
        public List<Testdata> GetTestUsers()
        {
            string path = _testdataRepositorySettings.RepositoryLocation + @"/" + TESTUSERS_FILENAME;
            string textData = File.ReadAllText(path, Encoding.UTF8);
            List<Testdata> testUser = JsonConvert.DeserializeObject<List<Testdata>>(textData);
            return testUser;
        }

        /// <inheritdoc />
        public List<ServicePrefill> GetServicePrefill(int instanceOwnerId, string applicationOwnerId, string applicationId, string developer = null)
        {
            _logger.LogInformation("Method is not implemented yet");
            return new List<ServicePrefill>();
        }
    }
}
