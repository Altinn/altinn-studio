using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Extensions.Primitives;

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

        public async Task<Instance> GetInstance(string app, string org, int instanceOwnerPartyId, Guid instanceId)
        {
            HttpResponseMessage response = new HttpResponseMessage
            {
                StatusCode = System.Net.HttpStatusCode.BadRequest,
                Content = new StringContent("ERROR"),
            };

            throw await PlatformHttpException.CreateAsync(response);
        }

        public Task<Instance> UpdateProcess(Instance instance)
        {
            throw new ServiceException(HttpStatusCode.Conflict, "CONFLICT");
        }

        public Task<List<Instance>> GetActiveInstances(int instanceOwnerPartyId)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> AddCompleteConfirmation(int instanceOwnerPartyId, Guid instanceGuid)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> UpdateReadStatus(int instanceOwnerPartyId, Guid instanceGuid, string readStatus)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> UpdateSubstatus(int instanceOwnerPartyId, Guid instanceGuid, Substatus substatus)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> UpdatePresentationTexts(int instanceOwnerPartyId, Guid instanceGuid, PresentationTexts presentationTexts)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> UpdateDataValues(int instanceOwnerPartyId, Guid instanceGuid, DataValues dataValues)
        {
            throw new NotImplementedException();
        }

        public Task<Instance> DeleteInstance(int instanceOwnerPartyId, Guid instanceGuid, bool hard)
        {
            throw new NotImplementedException();
        }

        public Task<List<Instance>> GetInstances(Dictionary<string, StringValues> queryParams)
        {
            throw new NotImplementedException();
        }
    }
}
