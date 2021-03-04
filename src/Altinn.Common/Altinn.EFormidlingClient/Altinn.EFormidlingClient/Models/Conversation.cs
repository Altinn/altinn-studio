using System;
using System.Collections.Generic;

namespace Altinn.Common.EFormidlingClient.Models
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Conversation"/> class.
    /// </summary>
    public class Conversation
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Conversation"/> class.
        /// </summary>
        /// <param name="id">ID</param>
        /// <param name="conversationId">ConversationId</param>
        /// <param name="messageId">MessageId</param>
        /// <param name="senderIdentifier">SenderIdentifier</param>
        /// <param name="receiverIdentifier">ReceiverIdentifier</param>
        /// <param name="processIdentifier">ProcessIdentifier</param>
        /// <param name="messageReference">MessageReference</param>
        /// <param name="messageTitle">MessageTitle</param>
        /// <param name="serviceCode">ServiceCode</param>
        /// <param name="serviceEditionCode">ServiceEditionCode</param>
        /// <param name="lastUpdate">LastUpdate</param>
        /// <param name="finished">Finished</param>
        /// <param name="expiry">Expiry</param>
        /// <param name="direction">Direction</param>
        /// <param name="serviceIdentifier">ServiceIdentifier</param>
        /// <param name="messageStatuses">MessageStatuses</param>
        public Conversation(int id, string conversationId, string messageId, string senderIdentifier, string receiverIdentifier, string processIdentifier, string messageReference, string messageTitle, string serviceCode, string serviceEditionCode, DateTime lastUpdate, bool finished, DateTime expiry, string direction, string serviceIdentifier, List<MessageStatus> messageStatuses)
        {
            Id = id;
            ConversationId = conversationId;
            MessageId = messageId;
            SenderIdentifier = senderIdentifier;
            ReceiverIdentifier = receiverIdentifier;
            ProcessIdentifier = processIdentifier;
            MessageReference = messageReference;
            MessageTitle = messageTitle;
            ServiceCode = serviceCode;
            ServiceEditionCode = serviceEditionCode;
            LastUpdate = lastUpdate;
            Finished = finished;
            Expiry = expiry;
            Direction = direction;
            ServiceIdentifier = serviceIdentifier;
            MessageStatuses = messageStatuses;
        }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string ConversationId { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string MessageId { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string SenderIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string ReceiverIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string ProcessIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string MessageReference { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string MessageTitle { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string ServiceCode { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string ServiceEditionCode { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public DateTime LastUpdate { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public bool Finished { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public DateTime Expiry { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string Direction { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string ServiceIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public List<MessageStatus> MessageStatuses { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="MessageStatus"/> class.
    /// </summary>
    public class MessageStatus
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="MessageStatus"/> class.
        /// </summary>
        /// <param name="id">Id</param>
        /// <param name="lastUpdate">LastUpdate</param>
        /// <param name="status">Status</param>
        /// <param name="description">Description</param>
        public MessageStatus(int id, DateTime lastUpdate, string status, string description)
        {
            Id = id;
            LastUpdate = lastUpdate;
            Status = status;
            Description = description;
        }

        /// <summary>
        ///  Gets or sets the Id
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        ///  Gets or sets the LastUpdate
        /// </summary>
        public DateTime LastUpdate { get; set; }

        /// <summary>
        ///  Gets or sets the Status
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        ///  Gets or sets the Description
        /// </summary>
        public string Description { get; set; }
    }
}
