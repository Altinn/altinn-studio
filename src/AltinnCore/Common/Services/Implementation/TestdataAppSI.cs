using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for application test data
    /// </summary>
    public class TestdataAppSI : ITestdata
    {
        private const string TESTUSERS_FILENAME = "testusers.json";
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IInstance _instance;

        /// <summary>
        /// Initializes a new instance of the <see cref="TestdataAppSI"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="repositorySettings">Service repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="instanceSI">the instance service</param>
        public TestdataAppSI(IOptions<TestdataRepositorySettings> testdataRepositorySettings, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IInstance instanceSI)
        {
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _instance = instanceSI;
        }

        /// <inheritdoc />
        public List<ServiceInstance> GetFormInstances(int instanceOwnerId, string applicationOwnerId, string applicationId)
        {
            List<ServiceInstance> returnList = new List<ServiceInstance>();
            List<Instance> instances = _instance.GetInstances(applicationId, applicationOwnerId, instanceOwnerId).Result;
            if (instances != null && instances.Count > 0)
            {
                foreach (Instance instance in instances)
                {
                    returnList.Add(new ServiceInstance
                    {
                        ServiceInstanceID = Guid.Parse(instance.Id),
                        IsArchived = instance.IsCompleted,
                        LastChanged = instance.LastChangedDateTime
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
        public List<ServicePrefill> GetServicePrefill(int instanceOwnerId, string applicationOwnerId, string applicationId)
        {
            // TDOD: to be implemented
            return new List<ServicePrefill>();
        }
    }
}
