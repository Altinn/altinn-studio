using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using LocalTest.Services.Localtest.Interface;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace LocalTest.Services.Storage.Implementation
{
    public class ApplicationRepository : IApplicationRepository
    {
        private readonly ILocalTestAppSelection _localTestAppSelectionService;
        private readonly ILogger _logger;

        public ApplicationRepository(ILocalTestAppSelection localTestAppSelectionService, ILogger<ApplicationRepository> logger)
        {
            _localTestAppSelectionService = localTestAppSelectionService;
            _logger = logger;
        }

        public Task<Application> Create(Application item)
        {
            throw new NotImplementedException();
        }

        public Task<bool> Delete(string appId, string org)
        {
            throw new NotImplementedException();
        }

        public Task<Application> FindOne(string appId, string org)
        {
            string filedata = string.Empty;
            string filename = GetApplicationPath();

            try
            {
                if (File.Exists(filename))
                {
                    filedata = File.ReadAllText(filename, Encoding.UTF8);
                }

                return Task.FromResult(JsonConvert.DeserializeObject<Application>(filedata));
            }
            catch (Exception ex)
            {
                _logger.LogError("Something went wrong when fetching application metadata. {0}", ex);
                return null;
            }
        }

        public Task<Dictionary<string, Dictionary<string, string>>> GetAppTitles(List<string> appIds)
        {
            throw new NotImplementedException();
        }

        public Task<List<Application>> ListApplications(string org)
        {
            throw new NotImplementedException();
        }

        public Task<Application> Update(Application item)
        {
            throw new NotImplementedException();
        }

        private string GetApplicationPath()
        {
           return  _localTestAppSelectionService.GetAppPath() + "config/applicationmetadata.json";
        }
    }
}
