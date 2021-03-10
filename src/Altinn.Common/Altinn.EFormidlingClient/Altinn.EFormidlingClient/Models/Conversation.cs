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
