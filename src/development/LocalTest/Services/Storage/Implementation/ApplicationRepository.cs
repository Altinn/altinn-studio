using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using LocalTest.Services.Localtest.Interface;
using LocalTest.Services.LocalApp.Interface;
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
        private readonly ILocalApp _localApp;
        private readonly ILogger _logger;

        public ApplicationRepository( ILocalApp localApp, ILogger<ApplicationRepository> logger)
        {
            _localApp = localApp;
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

        public async Task<Application> FindOne(string appId, string org)
        {
            var application = await _localApp.GetApplicationMetadata(appId);
            if (application == null)
            {
                throw new Exception($"applicationmetadata for '{appId} not found'");
            }
            
            return application;
        }

        public Task<Dictionary<string, Dictionary<string, string>>> GetAppTitles(List<string> appIds)
        {
            throw new NotImplementedException();
        }

        public Task<List<Application>> FindByOrg(string org)
        {
            throw new NotImplementedException();
        }

        public Task<Application> Update(Application item)
        {
            throw new NotImplementedException();
        }

        public Task<List<Application>> FindAll()
        {
            throw new NotImplementedException();
        }

        public Task<Dictionary<string, string>> GetAllAppTitles()
        {
            throw new NotImplementedException();
        }
    }
}
