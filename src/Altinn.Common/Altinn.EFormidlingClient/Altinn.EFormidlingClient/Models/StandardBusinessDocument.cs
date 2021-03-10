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
        [JsonPropertyName("standardBusinessDocumentHeader")]
        public StandardBusinessDocumentHeader StandardBusinessDocumentHeader { get; set; }

        /// <summary>
        ///  Gets or sets the Arkivmelding
        /// </summary>
        [JsonPropertyName("arkivmelding")]
        public Arkivmelding Arkivmelding { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="StandardBusinessDocument"/> class.
        /// </summary>
        /// <param name="standardBusinessDocumentHeader">StandardBusinessDocumentHeader</param>
        /// <param name="arkivmelding">Arkivmelding</param>
        public StandardBusinessDocument(StandardBusinessDocumentHeader standardBusinessDocumentHeader, Arkivmelding arkivmelding)
        {
            StandardBusinessDocumentHeader = standardBusinessDocumentHeader;
            Arkivmelding = arkivmelding;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Identifier"/> class.
    /// </summary>
    public class Identifier
    {
        /// <summary>
        ///  Gets or sets the Value
        /// </summary>
        [JsonPropertyName("value")]
        public string Value { get; set; }

        /// <summary>
        ///  Gets or sets the Authority
        /// </summary>
        [JsonPropertyName("authority")]
        public string Authority { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Identifier"/> class.
        /// </summary>
        /// <param name="value">Value</param>
        /// <param name="authority">Authority</param>
        public Identifier(string value, string authority)
        {
            Value = value;
            Authority = authority;
        }
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

        /// <summary>
        /// Initializes a new instance of the <see cref="Sender"/> class.
        /// </summary>
        /// <param name="identifier">Identifier</param>
        /// <param name="contactInformation">ContactInformation</param>
        public Sender(Identifier identifier, List<object> contactInformation)
        {
            Identifier = identifier;
            ContactInformation = contactInformation;
        }
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

        /// <summary>
        /// Initializes a new instance of the <see cref="Receiver"/> class.
        /// </summary>
        /// <param name="identifier">Identifier</param>
        /// <param name="contactInformation">ContactInformation</param>
        public Receiver(Identifier identifier, List<object> contactInformation)
        {
            Identifier = identifier;
            ContactInformation = contactInformation;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentIdentification"/> class.
    /// </summary>
    public class DocumentIdentification
    {
        /// <summary>
        ///  Gets or sets the Standard
        /// </summary>
        [JsonPropertyName("standard")]
        public string Standard { get; set; }

        /// <summary>
        ///  Gets or sets the TypeVersion
        /// </summary>
        [JsonPropertyName("typeVersion")]
        public string TypeVersion { get; set; }

        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("instanceIdentifier")]
        public string InstanceIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }

        /// <summary>
        ///  Gets or sets the CreationDateAndTime
        /// </summary>
        [JsonPropertyName("creationDateAndTime")]
        public DateTime CreationDateAndTime { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="DocumentIdentification"/> class.
        /// </summary>
        /// <param name="standard">Standard</param>
        /// <param name="typeVersion">TypeVersion</param>
        /// <param name="instanceIdentifier">InstanceIdentifier</param>
        /// <param name="type">Type</param>
        /// <param name="creationDateAndTime">CreationDateAndTime</param>
        public DocumentIdentification(string standard, string typeVersion, string instanceIdentifier, string type, DateTime creationDateAndTime)
        {
            Standard = standard;
            TypeVersion = typeVersion;
            InstanceIdentifier = instanceIdentifier;
            Type = type;
            CreationDateAndTime = creationDateAndTime;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ScopeInformation"/> class.
    /// </summary>
    public class ScopeInformation
    {
        /// <summary>
        ///  Gets or sets the ExpectedResponseDateTime
        /// </summary>
        [JsonPropertyName("expectedResponseDateTime")]
        public DateTime ExpectedResponseDateTime { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="ScopeInformation"/> class.
        /// </summary>
        /// <param name="expectedResponseDateTime">ExpectedResponseDateTime</param>
        public ScopeInformation(DateTime expectedResponseDateTime)
        {
            ExpectedResponseDateTime = expectedResponseDateTime;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Scope"/> class.
    /// </summary>
    public class Scope
    {
        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }

        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("instanceIdentifier")]
        public string InstanceIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Identifier
        /// </summary>
        [JsonPropertyName("identifier")]
        public string Identifier { get; set; }

        /// <summary>
        ///  Gets or sets the ScopeInformation
        /// </summary>
        [JsonPropertyName("scopeInformation")]
        public List<ScopeInformation> ScopeInformation { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Scope"/> class.
        /// </summary>
        /// <param name="type">Type</param>
        /// <param name="instanceIdentifier">InstanceIdentifier</param>
        /// <param name="identifier">Identifier</param>
        /// <param name="scopeInformation">ScopeInformation</param>
        public Scope(string type, string instanceIdentifier, string identifier, List<ScopeInformation> scopeInformation)
        {
            Type = type;
            InstanceIdentifier = instanceIdentifier;
            Identifier = identifier;
            ScopeInformation = scopeInformation;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="BusinessScope"/> class.
    /// </summary>
    public class BusinessScope
    {
        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("scope")]
        public List<Scope> Scope { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="BusinessScope"/> class.
        /// </summary>
        /// <param name="scope">Scope</param>
        public BusinessScope(List<Scope> scope)
        {
            Scope = scope;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="StandardBusinessDocumentHeader"/> class.
    /// </summary>
    public class StandardBusinessDocumentHeader
    {
        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("headerVersion")]
        public string HeaderVersion { get; set; }

        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("sender")]
        public List<Sender> Sender { get; set; }

        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("receiver")]
        public List<Receiver> Receiver { get; set; }

        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("documentIdentification")]
        public DocumentIdentification DocumentIdentification { get; set; }

        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("businessScope")]
        public BusinessScope BusinessScope { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="StandardBusinessDocumentHeader"/> class.
        /// </summary>
        /// <param name="headerVersion">HeaderVersion</param>
        /// <param name="sender">Sender</param>
        /// <param name="receiver">Receiver</param>
        /// <param name="documentIdentification">DocumentIdentification</param>
        /// <param name="businessScope">BusinessScope</param>
        public StandardBusinessDocumentHeader(string headerVersion, List<Sender> sender, List<Receiver> receiver, DocumentIdentification documentIdentification, BusinessScope businessScope)
        {
            HeaderVersion = headerVersion;
            Sender = sender;
            Receiver = receiver;
            DocumentIdentification = documentIdentification;
            BusinessScope = businessScope;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Arkivmelding"/> class.
    /// </summary>
    public class Arkivmelding
    {
        /// <summary>
        ///  Gets or sets the InstanceIdentifier
        /// </summary>
        [JsonPropertyName("sikkerhetsnivaa")]
        public string Sikkerhetsnivaa { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Arkivmelding"/> class.
        /// </summary>
        /// <param name="sikkerhetsnivaa">Sikkerhetsnivaa</param>
        public Arkivmelding(string sikkerhetsnivaa)
        {
            Sikkerhetsnivaa = sikkerhetsnivaa;
        }
    }
}
