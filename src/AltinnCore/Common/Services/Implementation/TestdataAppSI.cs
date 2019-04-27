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
        private readonly ITestdata _testdataSI;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IInstance _instance;

        /// <summary>
        /// Initializes a new instance of the <see cref="TestdataAppSI"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="repositorySettings">Service repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="instanceSI">the instance service</param>
        /// <param name="testdata">the testdata service</param>
        public TestdataAppSI(IOptions<TestdataRepositorySettings> testdataRepositorySettings, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IInstance instanceSI, ITestdata testdata)
        {
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _instance = instanceSI;
            _testdataSI = testdata;
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
            List<ServiceInstance> returnList = new List<ServiceInstance>();
            List<Instance> instances = _instance.GetInstances(service, org, partyId).Result;
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
            return _testdataSI.GetServicePrefill(partyId, org, service, developer);
        }
    }
}
