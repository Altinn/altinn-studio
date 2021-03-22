using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace Altinn.Common.EFormidlingClient.Models
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Conversation"/> class.
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class Conversation
    {
        /// <summary>
        ///  Gets or sets the ID. Integer. The numeric message status ID.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        ///  Gets or sets the ConversationId. The conversationId - typically an UUID.
        /// </summary>
        public string ConversationId { get; set; }

        /// <summary>
        ///  Gets or sets the MessageId. The messageId - typically an UUID.
        /// </summary>
        public string MessageId { get; set; }

        /// <summary>
        ///  Gets or sets the SenderIdentifier. Descriptor with information to identify the sender. Requires a 0192: prefix for all norwegian organizations.
        /// </summary>
        public string SenderIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the ReceiverIdentifier. Descriptor with information to identify the receiver. Requires a 0192: prefix for all norwegian organizations. Prefix is not required for individuals.
        /// </summary>
        public string ReceiverIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the ProcessIdentifier. The process identifier used by the message.
        /// </summary>
        public string ProcessIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the MessageReference. The message reference
        /// </summary>
        public string MessageReference { get; set; }

        /// <summary>
        ///  Gets or sets the MessageTitle. The message title
        /// </summary>
        public string MessageTitle { get; set; }

        /// <summary>
        ///  Gets or sets the ServiceCode. Altinn service code
        /// </summary>
        public string ServiceCode { get; set; }

        /// <summary>
        ///  Gets or sets the ServiceEditionCode. Altinn service edition code.
        /// </summary>
        public string ServiceEditionCode { get; set; }

        /// <summary>
        ///  Gets or sets the LastUpdate. Date and time of status.
        /// </summary>
        public DateTime LastUpdate { get; set; }

        /// <summary>
        ///  Gets or sets the Finished. f the conversation has a finished state or not.
        /// </summary>
        public bool Finished { get; set; }

        /// <summary>
        ///  Gets or sets the Expiry. Expiry timestamp
        /// </summary>
        public DateTime Expiry { get; set; }

        /// <summary>
        ///  Gets or sets the Direction. The direction. Can be one of: OUTGOING, INCOMING
        /// </summary>
        public string Direction { get; set; }

        /// <summary>
        ///  Gets or sets the ServiceIdentifier. The service identifier. Can be one of: DPO, DPV, DPI, DPF, DPFIO, DPE, UNKNOWN
        /// </summary>
        public string ServiceIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the MessageStatuses. An array of message statuses.
        /// </summary>
        public List<MessageStatus> MessageStatuses { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="MessageStatus"/> class.
    /// </summary>
    public class MessageStatus
    {
        /// <summary>
        ///  Gets or sets the Id. Integer. The numeric message status ID.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        ///  Gets or sets the LastUpdate. Date and time of status.
        /// </summary>
        public DateTime LastUpdate { get; set; }

        /// <summary>
        ///  Gets or sets the Status. The message status. Can be one of: OPPRETTET, SENDT, MOTTATT, LEVERT, LEST, FEIL, ANNET, INNKOMMENDE_MOTTATT, INNKOMMENDE_LEVERT, LEVETID_UTLOPT.
        ///  More details can be found here: https://docs.digdir.no/eformidling_selfhelp_traffic_flow.html
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        ///  Gets or sets the Description
        /// </summary>
        public string Description { get; set; }
    }
}
