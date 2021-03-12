using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class EFormidlingClientMock : IEFormidlingClient
    {
        public Task<StandardBusinessDocument> CreateMessage(StandardBusinessDocument sbd)
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

        public Task<bool> SendMessage(string id)
        {
            throw new NotImplementedException();
        }

        public Task<bool> SubscribeeFormidling(string name, string pushEndpoint, string resource, string @event, string filter)
        {
            throw new NotImplementedException();
        }

        public Task<bool> UnSubscribeeFormidling(int id)
        {
            throw new NotImplementedException();
        }

        public Task<bool> UploadAttachment(Stream stream, string id, string filename)
        {
            throw new NotImplementedException();
        }
    }
}
