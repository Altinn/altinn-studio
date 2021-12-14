using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.EFormidlingClient.Models;

namespace Altinn.Common.EFormidlingClient
{
    /// <summary>
    /// Interface for actions related to the eFormidling Integration Point(IP) API.
    /// Ref: https://docs.digdir.no/eformidling_nm_restdocs.html
    /// </summary>
    public interface IEFormidlingClient
    {
        /// <summary>
        /// Subscribes to IP API with callback URL allowing to get push notifcation for message status
        /// </summary>
        /// <param name="subscription"> Object that is used to create subscription.</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<bool> SubscribeeFormidling(CreateSubscription subscription, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Deletes subscription by id
        /// </summary>
        /// <param name="id"> Id of previously created subscription</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<bool> UnSubscribeeFormidling(int id, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Creates a message using the Standard Business Document Header specification.
        /// The eFormidling IP uses this document to route it to the correct receiver(s).
        /// After creation a conversation is created in the IP keepting track of the messages.
        /// Ref: https://www.gs1.org/standards/edi/standard-business-document-header-sbdh
        /// </summary>
        /// <param name="sbd"> Client provides a SBD DTO popluated with necessary fields </param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<StandardBusinessDocument> CreateMessage(StandardBusinessDocument sbd, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Posts attachments related to the message e.g. binary files, arkivmelding.xml
        /// </summary>
        /// <param name="stream">Stream of file content</param>
        /// <param name="id">Descriptor which contains reference information which uniquely identifies this instance of the SBD between the sender and the receiver.</param>
        /// <param name="filename"> Name of file to send </param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<bool> UploadAttachment(Stream stream, string id, string filename, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Gets the capabilities for a receiver, i.e. the available process, serviceIdentifier, and documentTypes
        /// </summary>
        /// <param name="orgId"> The Organization Id to retrieve capabilities for</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<Capabilities> GetCapabilities(string orgId, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Retrieves outgoing messages on the outgoing qeueue of IP
        /// </summary>
        /// <param name="serviceIdentifier"> The service identifier to use</param>
        /// <returns>A <see cref="Task"/> representing the result of the asynchronous operation.</returns>
        Task FindOutGoingMessages(string serviceIdentifier, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Retrieves all created conversations. The response is paged with a default page size of 10.
        /// </summary>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<Conversation> GetAllConversations(Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Retrieves conversation on a given Id.
        /// </summary>
        /// <param name="id">Conversation Id</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<Conversation> GetConversationById(string id, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Retrieves conversation by message Id
        /// </summary>
        /// <param name="id">Message Id</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<Conversation> GetConversationByMessageId(string id, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Retrieves all message statuses
        /// </summary>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<Statuses> GetAllMessageStatuses(Dictionary<string, string> requestHeaders);

        /// <summary>
        /// Retrieves message status by id
        /// </summary>
        /// <param name="id">Message Id</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<Statuses> GetMessageStatusById(string id, Dictionary<string, string> requestHeaders);

        /// <summary>
        /// This is used to send the message. Completes the transaction.
        /// </summary>
        /// <param name="id"> Message Id</param>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        Task<bool> SendMessage(string id, Dictionary<string, string> requestHeaders);
    }
}
