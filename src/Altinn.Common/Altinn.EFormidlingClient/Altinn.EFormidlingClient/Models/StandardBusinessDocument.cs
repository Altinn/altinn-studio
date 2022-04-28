using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Altinn.Common.EFormidlingClient.Models.SBD
{
    /// <summary>
    /// Initializes a new instance of the <see cref="StandardBusinessDocument"/> class.
    /// </summary>
    public class StandardBusinessDocument
    {
        /// <summary>
        ///  Gets or sets the StandardBusinessDocumentHeader
        /// </summary>
        /// <value>T</value>
        [JsonPropertyName("standardBusinessDocumentHeader")]
        public StandardBusinessDocumentHeader StandardBusinessDocumentHeader { get; set; }

        /// <summary>
        ///  Gets or sets the Arkivmelding. Name of the attachment that is the main document.Especially when there are more than one attachment, there is a need to know which document is the main one.Should only be specified for DPF.
        /// </summary>
        [JsonPropertyName("arkivmelding")]
        public Arkivmelding Arkivmelding { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Identifier"/> class.
    /// </summary>
    public class Identifier
    {
        /// <summary>
        ///  Gets or sets the Value. Descriptor with information to identify this party. Requires a 0192: prefix for all norwegian organizations. Prefix is not required for individuals
        /// </summary>
        [JsonPropertyName("value")]
        public string Value { get; set; }

        /// <summary>
        ///  Gets or sets the Authority. Descriptor that qualifies the identifier used to identify the receiving party.
        /// </summary>
        [JsonPropertyName("authority")]
        public string Authority { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Sender"/> class.
    /// </summary>
    public class Sender
    {
        /// <summary>
        ///  Gets or sets the Identifier
        /// </summary>
        [JsonPropertyName("identifier")]
        public Identifier Identifier { get; set; }

        /// <summary>
        ///  Gets or sets the ContactInformation
        /// </summary>
        [JsonPropertyName("contactInformation")]
        public List<object> ContactInformation { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Receiver"/> class.
    /// </summary>
    public class Receiver
    {
        /// <summary>
        ///  Gets or sets the Identifier
        /// </summary>
        [JsonPropertyName("identifier")]
        public Identifier Identifier { get; set; }

        /// <summary>
        ///  Gets or sets the ContactInformation
        /// </summary>
        [JsonPropertyName("contactInformation")]
        public List<object> ContactInformation { get; set; }    
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentIdentification"/> class.
    /// </summary>
    public class DocumentIdentification
    {
        /// <summary>
        ///  Gets or sets the Standard. The originator of the type of the Business Data standard, e.g. SWIFT, OAG, EAN.UCC, EDIFACT, X12;
        ///  references which Data Dictionary is being used. Used for the task of verifying that the grammar of a message is valid
        /// </summary>
        [JsonPropertyName("standard")]
        public string Standard { get; set; }

        /// <summary>
        ///  Gets or sets the TypeVersion. Descriptor which contains versioning information or number of the standard that defines the document which is specified in the ’Type’ data element, e.g. values could be ‘1.3’ or ‘D.96A’, etc.
        ///  This is the version of the document itself and is different than the HeaderVersion.
        /// </summary>
        [JsonPropertyName("typeVersion")]
        public string TypeVersion { get; set; }

        /// <summary>
        ///  Gets or sets the InstanceIdentifier. Descriptor which contains reference information which uniquely identifies this instance of the SBD between the sender and the receiver.
        ///  This identifier identifies this document as distinct from others. There is only one SBD instance per Standard Header. The Instance Identifier is automatically generated as an UUID if not specified.
        /// </summary>
        [JsonPropertyName("instanceIdentifier")]
        public string InstanceIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Type. A logical indicator representing the type of Business Data being sent or the named type of business data. This attribute identifies the type of document and not the instance of that document.
        ///  The instance document or interchange can contain one or more business documents of a single document type or closely related types.
        ///  The industry standard body (as referenced in the ‘Standard’ element) is responsible for defining the Type value to be used in this field. Currently NextMove supports the following types:
        ///  status, arkivmelding_kvittering, arkivmelding, avtalt, digital, digital_dpv, print, einnsyn_kvittering, innsynskrav, publisering
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }

        /// <summary>
        ///  Gets or sets the CreationDateAndTime. Descriptor which contains date and time of SBDH/document creation. In the SBDH the parser translator or service component assigns the SBD a Date and Time stamp.
        ///  The creation date and time expressed here most likely will be different from the date and time stamped in the transport envelope.
        /// </summary>
        [JsonPropertyName("creationDateAndTime")]
        public DateTime CreationDateAndTime { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ScopeInformation"/> class.
    /// </summary>
    public class ScopeInformation
    {
        /// <summary>
        ///  Gets or sets the ExpectedResponseDateTime. Date and time when response is expected. This element could be populated in an
        ///  initial message of a correlation sequence, and should be echoed back in a subsequent response.
        /// </summary>
        [JsonPropertyName("expectedResponseDateTime")]
        public DateTime ExpectedResponseDateTime { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Scope"/> class.
    /// </summary>
    public class Scope
    {
        /// <summary>
        ///  Gets or sets the Type. Indicates the kind of scope; an attribute describing the Scope. Example entries include: ConversationId, SenderRef, ReceiverRef
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }

        /// <summary>
        ///  Gets or sets the InstanceIdentifier. A unique identifier that references the instance of the scope (e.g. process execution instance, document instance). For example, the Instance Identifier could be used to identify the specific instance of a Business Process.
        ///  This identifier would be used to correlate all the way back to the business domain layer; it can be thought of as a session descriptor at the business domain application level.
        /// </summary>
        [JsonPropertyName("instanceIdentifier")]
        public string InstanceIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Identifier. An optional unique descriptor that identifies the "contract" or "agreement" that this instance relates to. It operates at the level of business domain, not at the transport or messaging level
        ///  by providing the information necessary and sufficient to configure the service at the other partner’s end.
        /// </summary>
        [JsonPropertyName("identifier")]
        public string Identifier { get; set; }

        /// <summary>
        ///  Gets or sets the ScopeInformation. An optional unique descriptor that identifies the "contract" or "agreement" that this instance relates to. It operates at the level of business domain, not at the transport or messaging level
        ///  by providing the information necessary and sufficient to configure the service at the other partner’s end.
        /// </summary>
        [JsonPropertyName("scopeInformation")]
        public List<ScopeInformation> ScopeInformation { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="BusinessScope"/> class.
    /// </summary>
    public class BusinessScope
    {
        /// <summary>
        ///  Gets or sets the Scope. Indicates the type of scope, the identifiers for the scope, other supporting information and the scope content itself.
        ///  The importance of the Scope is that it allows the SBDH to operate under auspices of an agreement; that parties agree that they only include reference agreements
        /// </summary>
        [JsonPropertyName("scope")]
        public List<Scope> Scope { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="StandardBusinessDocumentHeader"/> class.
    /// </summary>
    public class StandardBusinessDocumentHeader
    {
        /// <summary>
        ///  Gets or sets the HeaderVersion.
        /// </summary>
        [JsonPropertyName("headerVersion")]
        public string HeaderVersion { get; set; }

        /// <summary>
        ///  Gets or sets the Sender. Logical party representing the organization that has created the standard business document.
        /// </summary>
        [JsonPropertyName("sender")]
        public List<Sender> Sender { get; set; }

        /// <summary>
        ///  Gets or sets the Receiver. Logical party representing the organization that receives the SBD.
        /// </summary>
        [JsonPropertyName("receiver")]
        public List<Receiver> Receiver { get; set; }

        /// <summary>
        ///  Gets or sets the DocumentIdentification. Characteristics containing identification about the document.
        /// </summary>
        [JsonPropertyName("documentIdentification")]
        public DocumentIdentification DocumentIdentification { get; set; }

        /// <summary>
        ///  Gets or sets the BusinessScope. The business scope contains 1 to many [1..*] scopes. It is not mandatory to put all intermediary scopes in an SBDH. Only those scopes that the parties agree to are valid. The following examples are all valid: transaction; business process; collaboration. A Profile may be used to group well-formedness rules together. The business scope block consists of the Scope block.
        /// </summary>
        [JsonPropertyName("businessScope")]
        public BusinessScope BusinessScope { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Arkivmelding"/> class.
    /// </summary>
    public class Arkivmelding
    {
        /// <summary>
        ///  Gets or sets the Sikkerhetsnivaa. Defines the authentication level required for the document to be opened.
        /// </summary>
        [JsonPropertyName("sikkerhetsnivaa")]
        public int Sikkerhetsnivaa { get; set; }

        /// <summary>
        ///  Gets or sets the DPF. Defines the configuration related to Digital post til FIKS meldingsformidler.
        /// </summary>
        [JsonPropertyName("dpf")]
        public DPF DPF { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="DPF"/> class.
    /// </summary>
    public class DPF
    {
        /// <summary>
        ///  Gets or sets the ForsendelsesType. Used for routing on the receiving end.
        /// </summary>
        [JsonPropertyName("forsendelseType")]
        public string ForsendelsesType { get; set; }
    }
}
