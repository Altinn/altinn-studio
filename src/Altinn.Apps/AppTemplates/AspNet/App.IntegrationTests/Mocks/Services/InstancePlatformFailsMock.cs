using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Services
{
    public class InstancePlatformFailsMock : IInstance
    {
        public async Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate)
        {
            HttpResponseMessage response = new HttpResponseMessage
            {
                StatusCode = System.Net.HttpStatusCode.BadRequest,
                Content = new StringContent("ERROR"),
            };

            throw await PlatformHttpException.CreateAsync(response);

        }

        /// <inheritdoc />
        public async Task<Instance> GetInstance(Instance instance)
        {
            HttpResponseMessage response = new HttpResponseMessage
            {
                StatusCode = System.Net.HttpStatusCode.BadRequest,
                Content = new StringContent("ERROR"),
            };

            throw await PlatformHttpException.CreateAsync(response);
        }

        public async Task<Instance> GetInstance(string app, string org, int instanceOwnerId, Guid instanceId)
        {
            HttpResponseMessage response = new HttpResponseMessage
            {
                StatusCode = System.Net.HttpStatusCode.BadRequest,
                Content = new StringContent("ERROR"),
            };

            throw await PlatformHttpException.CreateAsync(response);
        }

        public Task<Instance> UpdateInstance(Instance instance)
        {
            throw new ServiceException(HttpStatusCode.Conflict, "CONFLICT");
        }

        public Task<Instance> UpdateProcess(Instance instance)
        {
            throw new ServiceException(HttpStatusCode.Conflict, "CONFLICT");
        }

        public Task<List<Instance>> GetInstances(int instanceOwnerPartyId)
        {
            throw new NotImplementedException();
        }
    }
}
