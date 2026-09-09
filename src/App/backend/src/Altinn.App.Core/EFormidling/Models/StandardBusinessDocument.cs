using System.Text.Json.Serialization;

namespace Altinn.App.Core.EFormidling.Models.SBD;

/// <summary>
/// The envelope the eFormidling integrasjonspunkt routes a shipment by, following the GS1 Standard
/// Business Document Header specification.
/// Ref: <see href="https://www.gs1.org/standards/edi/standard-business-document-header-sbdh"/>.
/// </summary>
public sealed class StandardBusinessDocument
{
    /// <summary>
    /// The header describing sender, receiver, document and business scope.
    /// </summary>
    [JsonPropertyName("standardBusinessDocumentHeader")]
    public StandardBusinessDocumentHeader? StandardBusinessDocumentHeader { get; set; }

    /// <summary>
    /// Shipment metadata for the arkivmelding this document carries.
    /// </summary>
    [JsonPropertyName("arkivmelding")]
    public ArkivmeldingMetadata? Arkivmelding { get; set; }
}

/// <summary>
/// Identifies a party to the shipment.
/// </summary>
public sealed class Identifier
{
    /// <summary>
    /// The identifying value. Requires a <c>0192:</c> prefix for Norwegian organizations; the prefix is
    /// not required for individuals.
    /// </summary>
    [JsonPropertyName("value")]
    public string? Value { get; set; }

    /// <summary>
    /// The authority qualifying <see cref="Value"/>, for example <c>iso6523-actorid-upis</c>.
    /// </summary>
    [JsonPropertyName("authority")]
    public string? Authority { get; set; }
}

/// <summary>
/// The organization that created the standard business document.
/// </summary>
public sealed class Sender
{
    /// <summary>
    /// Identifies the sender.
    /// </summary>
    [JsonPropertyName("identifier")]
    public Identifier? Identifier { get; set; }

    /// <summary>
    /// Contact information for the sender.
    /// </summary>
    [JsonPropertyName("contactInformation")]
    public List<object>? ContactInformation { get; set; }
}

/// <summary>
/// An organization receiving the standard business document.
/// </summary>
public sealed class Receiver
{
    /// <summary>
    /// Identifies the receiver.
    /// </summary>
    [JsonPropertyName("identifier")]
    public Identifier? Identifier { get; set; }

    /// <summary>
    /// Contact information for the receiver.
    /// </summary>
    [JsonPropertyName("contactInformation")]
    public List<object>? ContactInformation { get; set; }
}

/// <summary>
/// Identifies the document being sent.
/// </summary>
public sealed class DocumentIdentification
{
    /// <summary>
    /// The originator of the business data standard, used to verify that a message's grammar is valid.
    /// </summary>
    [JsonPropertyName("standard")]
    public string? Standard { get; set; }

    /// <summary>
    /// The version of the standard that defines the document named by <see cref="Type"/>. This is the
    /// version of the document itself, not of the header.
    /// </summary>
    [JsonPropertyName("typeVersion")]
    public string? TypeVersion { get; set; }

    /// <summary>
    /// Reference information uniquely identifying this instance of the document between sender and
    /// receiver. Generated as a UUID if not supplied; Altinn apps use the instance guid.
    /// </summary>
    [JsonPropertyName("instanceIdentifier")]
    public string? InstanceIdentifier { get; set; }

    /// <summary>
    /// The type of business data being sent. NextMove supports <c>status</c>,
    /// <c>arkivmelding_kvittering</c>, <c>arkivmelding</c>, <c>avtalt</c>, <c>digital</c>,
    /// <c>digital_dpv</c>, <c>print</c>, <c>einnsyn_kvittering</c>, <c>innsynskrav</c> and
    /// <c>publisering</c>.
    /// </summary>
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    /// <summary>
    /// When the document was created. Likely to differ from the timestamp on the transport envelope.
    /// </summary>
    [JsonPropertyName("creationDateAndTime")]
    public DateTime CreationDateAndTime { get; set; }
}

/// <summary>
/// Supporting information for a <see cref="Scope"/>.
/// </summary>
public sealed class ScopeInformation
{
    /// <summary>
    /// When a response is expected. The integrasjonspunkt reads the shipment's lifetime from this and
    /// marks the message <c>levetid_utlopt</c> once it passes.
    /// </summary>
    [JsonPropertyName("expectedResponseDateTime")]
    public DateTime ExpectedResponseDateTime { get; set; }
}

/// <summary>
/// One scope the document operates under, such as a conversation or a business process.
/// </summary>
public sealed class Scope
{
    /// <summary>
    /// The kind of scope, for example <c>ConversationId</c>, <c>SenderRef</c> or <c>ReceiverRef</c>.
    /// </summary>
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    /// <summary>
    /// Identifies the instance of the scope, for example a specific business process execution.
    /// </summary>
    [JsonPropertyName("instanceIdentifier")]
    public string? InstanceIdentifier { get; set; }

    /// <summary>
    /// Identifies the agreement this instance relates to, at the level of the business domain rather
    /// than transport or messaging.
    /// </summary>
    [JsonPropertyName("identifier")]
    public string? Identifier { get; set; }

    /// <summary>
    /// Supporting information for this scope.
    /// </summary>
    [JsonPropertyName("scopeInformation")]
    public List<ScopeInformation>? ScopeInformation { get; set; }
}

/// <summary>
/// The scopes the document operates under.
/// </summary>
public sealed class BusinessScope
{
    /// <summary>
    /// The scopes. Only those the parties have agreed to are valid; intermediary scopes need not all
    /// be present.
    /// </summary>
    [JsonPropertyName("scope")]
    public List<Scope>? Scope { get; set; }
}

/// <summary>
/// The header of a <see cref="StandardBusinessDocument"/>.
/// </summary>
public sealed class StandardBusinessDocumentHeader
{
    /// <summary>
    /// The version of the header specification.
    /// </summary>
    [JsonPropertyName("headerVersion")]
    public string? HeaderVersion { get; set; }

    /// <summary>
    /// The parties that created the document.
    /// </summary>
    [JsonPropertyName("sender")]
    public List<Sender>? Sender { get; set; }

    /// <summary>
    /// The parties receiving the document.
    /// </summary>
    [JsonPropertyName("receiver")]
    public List<Receiver>? Receiver { get; set; }

    /// <summary>
    /// Identification of the document.
    /// </summary>
    [JsonPropertyName("documentIdentification")]
    public DocumentIdentification? DocumentIdentification { get; set; }

    /// <summary>
    /// The scopes the document operates under.
    /// </summary>
    [JsonPropertyName("businessScope")]
    public BusinessScope? BusinessScope { get; set; }
}

/// <summary>
/// Shipment metadata for the arkivmelding carried by a <see cref="StandardBusinessDocument"/>.
/// </summary>
/// <remarks>
/// Named for what it is rather than for the JSON property it serializes to: this is metadata
/// <em>about</em> the shipped arkivmelding, not the arkivmelding itself — that is
/// <see cref="Altinn.App.Core.EFormidling.Models.Arkivmelding"/>, the Noark 5 document, which shared
/// this name until v9.
/// </remarks>
public sealed class ArkivmeldingMetadata
{
    /// <summary>
    /// The authentication level required to open the document.
    /// </summary>
    [JsonPropertyName("sikkerhetsnivaa")]
    public int Sikkerhetsnivaa { get; set; }

    /// <summary>
    /// Configuration for Digital post til FIKS meldingsformidler.
    /// </summary>
    [JsonPropertyName("dpf")]
    public Dpf? Dpf { get; set; }
}

/// <summary>
/// Configuration for Digital post til FIKS meldingsformidler.
/// </summary>
/// <remarks>
/// Left alongside <see cref="ArkivmeldingMetadata"/> rather than nested inside it: C# forbids a nested
/// type and a property sharing a name, and every alternative name reads worse than matching the
/// property. Every other type in this namespace pairs with a same-named property the same way.
/// </remarks>
public sealed class Dpf
{
    /// <summary>
    /// The shipment type, used for routing on the receiving end.
    /// </summary>
    [JsonPropertyName("forsendelseType")]
    public string? ForsendelsesType { get; set; }
}
