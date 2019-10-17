using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// App implementation of the test data service.
    /// </summary>
    public class TestdataAppSI : ITestdata
    {
        private const string TESTUSERS_FILENAME = "testusers.json";
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IInstance _instance;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TestdataAppSI"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="repositorySettings">Service repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="instanceSI">the instance service</param>
        /// <param name="logger">The logger</param>
        public TestdataAppSI(
            IOptions<TestdataRepositorySettings> testdataRepositorySettings,
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IInstance instanceSI,
            ILogger<TestdataAppSI> logger)
        {
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _instance = instanceSI;
            _logger = logger;
        }

        /// <inheritdoc />
        public List<ServiceInstance> GetFormInstances(int instanceOwnerId, string org, string app)
        {
            List<ServiceInstance> returnList = new List<ServiceInstance>();
            List<Instance> instances = _instance.GetInstances(app, org, instanceOwnerId).Result;
            if (instances != null && instances.Count > 0)
            {
                foreach (Instance instance in instances)
                {
                    returnList.Add(new ServiceInstance
                    {
                        ServiceInstanceID = instance.Id,
                        IsArchived = instance.InstanceState != null ? instance.InstanceState.IsArchived : false,
                        LastChanged = instance.LastChangedDateTime ?? DateTime.MinValue,
                    });
                }
            }

            return returnList;
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
        public List<ServicePrefill> GetServicePrefill(int instanceOwnerId, string org, string app)
        {
            // TDOD: to be implemented
            return new List<ServicePrefill>();
        }
    }
}
