using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.EFormidlingClient.Models;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class EFormidlingClientMock : IEFormidlingClient
    {
        /// <inheritdoc/>
        public Task<StandardBusinessDocument> CreateMessage(StandardBusinessDocument sbd)
        {
            var jsonContent = JsonSerializer.Serialize(sbd);
            byte[] buffer = Encoding.UTF8.GetBytes(jsonContent);
            ByteArrayContent byteContent = new ByteArrayContent(buffer);
            byteContent.Headers.Remove("Content-Type");
            byteContent.Headers.Add("Content-Type", "application/json");

            return Task.FromResult(sbd);
        }

        public Task<bool> UploadAttachment(Stream stream, string id, string filename)
        {
            return Task.FromResult(true);
        }

        public Task<bool> SendMessage(string id)
        {
            return Task.FromResult(true);
        }

        public Task<bool> SubscribeeFormidling(string name, string pushEndpoint, string resource, string @event, string filter)
        {
            throw new NotImplementedException();
        }

        public Task<bool> SubscribeeFormidling(CreateSubscription subscription)
        {
            throw new NotImplementedException();
        }

        public Task<bool> UnSubscribeeFormidling(int id)
        {
            throw new NotImplementedException();
        }

        public Task FindOutGoingMessages(string serviceIdentifier)
        {
            throw new NotImplementedException();
        }

        public Task<Conversation> GetAllConversations()
        {
            throw new NotImplementedException();
        }

        public Task<Statuses> GetAllMessageStatuses()
        {
            throw new NotImplementedException();
        }

        public Task<Capabilities> GetCapabilities(string orgId)
        {
            throw new NotImplementedException();
        }

        public Task<Conversation> GetConversationById(string id)
        {
            throw new NotImplementedException();
        }

        public Task<Conversation> GetConversationByMessageId(string id)
        {
            throw new NotImplementedException();
        }

        public Task<Statuses> GetMessageStatusById(string id)
        {
            throw new NotImplementedException();
        }
    }
}
