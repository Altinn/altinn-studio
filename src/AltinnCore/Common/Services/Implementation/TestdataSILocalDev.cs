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
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Services with functionality for test data under service development
    /// </summary>
    public class TestdataSILocalDev : ITestdata
    {
        private const string TESTUSERS_FILENAME = "testusers.json";

        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string GetFormInstancesApiMethod = "GetFormInstances";
        private const string GetServicePrefillApiMethod = "GetServicePrefill";

        /// <summary>
        /// Initializes a new instance of the <see cref="TestdataSILocalDev"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">Test data repository settings</param>
        /// <param name="repositorySettings">Service repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        public TestdataSILocalDev(IOptions<TestdataRepositorySettings> testdataRepositorySettings, IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor)
        {
            this._testdataRepositorySettings = testdataRepositorySettings.Value;
            this._settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
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
            string apiUrl = _settings.GetRuntimeAPIPath(GetFormInstancesApiMethod, org, service, developer, partyId);
            List<ServiceInstance> returnList = new List<ServiceInstance>();
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                returnList = response.Result.Content.ReadAsAsync<List<ServiceInstance>>().Result;
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
            string apiUrl = _settings.GetRuntimeAPIPath(GetServicePrefillApiMethod, org, service, developer, partyId);
            List<ServicePrefill> returnList = new List<ServicePrefill>();
            using (HttpClient client = AuthenticationHelper.GetDesignerHttpClient(_httpContextAccessor.HttpContext, _testdataRepositorySettings.GetDesignerHost()))
            {
                client.BaseAddress = new Uri(apiUrl);
                Task<HttpResponseMessage> response = client.GetAsync(apiUrl);
                if (response.Result.IsSuccessStatusCode)
                {
                    try
                    {
                        returnList = response.Result.Content.ReadAsAsync<List<ServicePrefill>>().Result;
                    }
                    catch
                    {
                        return returnList;
                    }
                }
                else
                {
                    return returnList;
                }
            }

            return returnList;
        }
    }
}
