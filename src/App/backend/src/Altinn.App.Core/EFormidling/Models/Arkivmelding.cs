using System.Xml.Serialization;

namespace Altinn.App.Core.EFormidling.Models;

/// <summary>
/// The Noark 5 arkivmelding document, typically serialized to <c>arkivmelding.xml</c> and shipped as
/// the metadata attachment of an eFormidling message.
/// </summary>
/// <remarks>
/// Generated from the XSD definition at
/// <see href="https://github.com/difi/felleslosninger/blob/gh-pages/resources/arkivmelding/arkivmelding.xsd"/>.
/// Distinct from <see cref="Altinn.App.Core.EFormidling.Models.SBD.ArkivmeldingMetadata"/>, which is
/// the shipment metadata carried in the SBD envelope.
/// <para>
/// Members throughout this file are declared in the schema's element order, because that is the order
/// <see cref="XmlSerializer"/> emits and the receiving archive validates against. Sorting them by name
/// — which is how several of these types arrived — emits invalid XML.
/// </para>
/// </remarks>
[XmlRoot(ElementName = "arkivmelding", Namespace = ArkivmeldingNamespaces.Noark5)]
public sealed class Arkivmelding
{
    /// <summary>
    /// The system that produced the arkivmelding.
    /// </summary>
    [XmlElement(ElementName = "system", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? System { get; set; }

    /// <summary>
    /// The message id.
    /// </summary>
    [XmlElement(ElementName = "meldingId", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? MeldingId { get; set; }

    /// <summary>
    /// When the arkivmelding was produced.
    /// </summary>
    [XmlElement(ElementName = "tidspunkt", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? Tidspunkt { get; set; }

    /// <summary>
    /// The number of files in the shipment.
    /// </summary>
    [XmlElement(ElementName = "antallFiler", Namespace = ArkivmeldingNamespaces.Noark5)]
    public int AntallFiler { get; set; }

    /// <summary>
    /// The folders (saksmapper) the shipment archives.
    /// </summary>
    [XmlElement(ElementName = "mappe")]
    public List<Mappe>? Mappe { get; set; }

    /// <summary>
    /// The XML schema location.
    /// </summary>
    [XmlAttribute(AttributeName = "schemaLocation", Namespace = ArkivmeldingNamespaces.XmlSchemaInstance)]
    public string? SchemaLocation { get; set; }

    /// <summary>
    /// The default XML namespace declaration.
    /// </summary>
    [XmlAttribute(AttributeName = "xmlns", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? Xmlns { get; set; }

    /// <summary>
    /// The XML schema instance namespace declaration.
    /// </summary>
    [XmlAttribute(AttributeName = "xsi", Namespace = ArkivmeldingNamespaces.XmlNamespaceDeclaration)]
    public string? Xsi { get; set; }
}

/// <summary>
/// XML namespaces used by the Noark 5 arkivmelding model.
/// </summary>
public static class ArkivmeldingNamespaces
{
    /// <summary>
    /// The Noark 5 arkivmelding namespace.
    /// </summary>
    public const string Noark5 = "http://www.arkivverket.no/standarder/noark5/arkivmelding";

    /// <summary>
    /// The XML Schema instance namespace.
    /// </summary>
    public const string XmlSchemaInstance = "http://www.w3.org/2001/XMLSchema-instance";

    /// <summary>
    /// The XML namespace-declaration namespace.
    /// </summary>
    public const string XmlNamespaceDeclaration = "http://www.w3.org/2000/xmlns/";
}

/// <summary>
/// A document object — the file a <see cref="Dokumentbeskrivelse"/> describes.
/// </summary>
[XmlRoot(ElementName = "dokumentobjekt")]
public sealed class Dokumentobjekt
{
    /// <summary>
    /// The version number.
    /// </summary>
    [XmlElement(ElementName = "versjonsnummer")]
    public int Versjonsnummer { get; set; }

    /// <summary>
    /// The variant format, for example <c>Produksjonsformat</c>.
    /// </summary>
    [XmlElement(ElementName = "variantformat")]
    public string? Variantformat { get; set; }

    /// <summary>
    /// When the document object was created.
    /// </summary>
    [XmlElement(ElementName = "opprettetDato")]
    public DateTime OpprettetDato { get; set; }

    /// <summary>
    /// Who created the document object.
    /// </summary>
    [XmlElement(ElementName = "opprettetAv")]
    public string? OpprettetAv { get; set; }

    /// <summary>
    /// The name of the file this object refers to, which must match an attachment in the shipment.
    /// </summary>
    [XmlElement(ElementName = "referanseDokumentfil")]
    public string? ReferanseDokumentfil { get; set; }
}

/// <summary>
/// A document description — the metadata for one document in a registration.
/// </summary>
[XmlRoot(ElementName = "dokumentbeskrivelse")]
public sealed class Dokumentbeskrivelse
{
    /// <summary>
    /// The system id.
    /// </summary>
    [XmlElement(ElementName = "systemID")]
    public string? SystemID { get; set; }

    /// <summary>
    /// The document type.
    /// </summary>
    [XmlElement(ElementName = "dokumenttype")]
    public string? Dokumenttype { get; set; }

    /// <summary>
    /// The document status.
    /// </summary>
    [XmlElement(ElementName = "dokumentstatus")]
    public string? Dokumentstatus { get; set; }

    /// <summary>
    /// The document title.
    /// </summary>
    [XmlElement(ElementName = "tittel")]
    public string? Tittel { get; set; }

    /// <summary>
    /// When the document was created.
    /// </summary>
    [XmlElement(ElementName = "opprettetDato")]
    public DateTime OpprettetDato { get; set; }

    /// <summary>
    /// Who created the document.
    /// </summary>
    [XmlElement(ElementName = "opprettetAv")]
    public string? OpprettetAv { get; set; }

    /// <summary>
    /// How the document is attached to the registration, for example <c>hoveddokument</c>.
    /// </summary>
    [XmlElement(ElementName = "tilknyttetRegistreringSom")]
    public string? TilknyttetRegistreringSom { get; set; }

    /// <summary>
    /// The document number.
    /// </summary>
    [XmlElement(ElementName = "dokumentnummer")]
    public int Dokumentnummer { get; set; }

    /// <summary>
    /// When the document was attached.
    /// </summary>
    [XmlElement(ElementName = "tilknyttetDato")]
    public DateTime TilknyttetDato { get; set; }

    /// <summary>
    /// Who attached the document.
    /// </summary>
    [XmlElement(ElementName = "tilknyttetAv")]
    public string? TilknyttetAv { get; set; }

    /// <summary>
    /// The document objects this description refers to — one per variant or version of the document,
    /// for example a production format alongside an archive format.
    /// </summary>
    /// <remarks>Repeatable, per the schema's <c>dokumentbeskrivelse</c> type.</remarks>
    [XmlElement(ElementName = "dokumentobjekt")]
    public List<Dokumentobjekt>? Dokumentobjekt { get; set; }
}

/// <summary>
/// A correspondence party of a registration.
/// </summary>
[XmlRoot(ElementName = "korrespondansepart")]
public sealed class Korrespondansepart
{
    /// <summary>
    /// The kind of correspondence party.
    /// </summary>
    [XmlElement(ElementName = "korrespondanseparttype")]
    public string? Korrespondanseparttype { get; set; }

    /// <summary>
    /// The name of the correspondence party.
    /// </summary>
    [XmlElement(ElementName = "korrespondansepartNavn")]
    public string? KorrespondansepartNavn { get; set; }
}

/// <summary>
/// A basic registration — a journal entry (journalpost) within a folder.
/// </summary>
[XmlType(TypeName = "journalpost")]
public sealed class Basisregistrering
{
    /// <summary>
    /// The system id.
    /// </summary>
    [XmlElement(ElementName = "systemID")]
    public string? SystemID { get; set; }

    /// <summary>
    /// When the registration was created.
    /// </summary>
    [XmlElement(ElementName = "opprettetDato")]
    public DateTime OpprettetDato { get; set; }

    /// <summary>
    /// Who created the registration.
    /// </summary>
    [XmlElement(ElementName = "opprettetAv")]
    public string? OpprettetAv { get; set; }

    /// <summary>
    /// When the registration was archived.
    /// </summary>
    /// <remarks>
    /// Nullable because the schema declares it <c>minOccurs="0"</c>. As a plain <see cref="DateTime"/>
    /// it was written on every shipment whether set or not, so a registration that was never archived
    /// still claimed an archive date of <c>0001-01-01</c> — schema-valid, and therefore invisible to
    /// validation. Matches <see cref="ArkivertAv"/>, which has always omitted itself when unset.
    /// </remarks>
    [XmlElement(ElementName = "arkivertDato")]
    public DateTime? ArkivertDato { get; set; }

    /// <summary>
    /// Whether <see cref="ArkivertDato"/> is written. Serialization plumbing, not something to set.
    /// </summary>
    /// <remarks>
    /// <see cref="XmlSerializer"/> writes <c>xsi:nil</c> for a null <c>DateTime?</c>, which this schema
    /// rejects — the element is optional but not nillable — and it refuses
    /// <c>IsNullable = false</c> on a nullable type outright. The <c>Specified</c> convention is the
    /// remaining way to omit the element entirely, and deriving it from the value keeps it in step
    /// without anyone having to remember it.
    /// </remarks>
    [XmlIgnore]
    public bool ArkivertDatoSpecified
    {
        get => ArkivertDato.HasValue;
        set
        {
            if (!value)
            {
                ArkivertDato = null;
            }
        }
    }

    /// <summary>
    /// Who archived the registration.
    /// </summary>
    [XmlElement(ElementName = "arkivertAv")]
    public string? ArkivertAv { get; set; }

    /// <summary>
    /// A reference to the parent folder.
    /// </summary>
    [XmlElement(ElementName = "referanseForelderMappe")]
    public string? ReferanseForelderMappe { get; set; }

    /// <summary>
    /// The document descriptions for this registration — typically the main document followed by its
    /// attachments.
    /// </summary>
    /// <remarks>
    /// Repeatable, per the schema's <c>registrering</c> type. Ordered before <see cref="Tittel"/>
    /// because it belongs to the base type, and an XSD extension appends to its parent's sequence.
    /// </remarks>
    [XmlElement(ElementName = "dokumentbeskrivelse")]
    public List<Dokumentbeskrivelse>? Dokumentbeskrivelse { get; set; }

    /// <summary>
    /// Document objects attached directly to the registration rather than through a
    /// <see cref="Dokumentbeskrivelse"/>. Optional, and rarely used.
    /// </summary>
    [XmlElement(ElementName = "dokumentobjekt")]
    public List<Dokumentobjekt>? Dokumentobjekt { get; set; }

    /// <summary>
    /// The title.
    /// </summary>
    [XmlElement(ElementName = "tittel")]
    public string? Tittel { get; set; }

    /// <summary>
    /// The public title.
    /// </summary>
    [XmlElement(ElementName = "offentligTittel")]
    public string? OffentligTittel { get; set; }

    /// <summary>
    /// The journal entry type.
    /// </summary>
    [XmlElement(ElementName = "journalposttype")]
    public string? Journalposttype { get; set; }

    /// <summary>
    /// The journal status.
    /// </summary>
    [XmlElement(ElementName = "journalstatus")]
    public string? Journalstatus { get; set; }

    /// <summary>
    /// The journal date.
    /// </summary>
    /// <remarks>
    /// Emitted as an <c>xs:date</c>, which is what the schema declares. Without the explicit data type
    /// this serializes as an <c>xs:dateTime</c> and the element fails validation.
    /// </remarks>
    [XmlElement(ElementName = "journaldato", DataType = "date")]
    public DateTime Journaldato { get; set; }

    /// <summary>
    /// The correspondence parties of the registration — typically the sender and each recipient.
    /// </summary>
    /// <remarks>Repeatable, per the schema's <c>journalpost</c> type.</remarks>
    [XmlElement(ElementName = "korrespondansepart")]
    public List<Korrespondansepart>? Korrespondansepart { get; set; }

    /// <summary>
    /// The XML schema instance type, which selects the concrete registration type.
    /// </summary>
    [XmlAttribute(AttributeName = "type", Namespace = ArkivmeldingNamespaces.XmlSchemaInstance)]
    public string? Type { get; set; }

    /// <summary>
    /// Free text content of the element.
    /// </summary>
    [XmlText]
    public string? Text { get; set; }
}

/// <summary>
/// A folder (saksmappe) holding registrations.
/// </summary>
/// <remarks>
/// Declared in the schema's element order, which is what <see cref="XmlSerializer"/> emits. The
/// schema's <c>saksmappe</c> extends <c>mappe</c>, so the base type's elements come first — down to
/// and including the registrations — and only then the case-handling elements the extension adds.
/// Sorting these members by name would emit invalid XML.
/// </remarks>
[XmlType(TypeName = "saksmappe")]
public sealed class Mappe
{
    /// <summary>
    /// The system id.
    /// </summary>
    [XmlElement(ElementName = "systemID", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? SystemID { get; set; }

    /// <summary>
    /// The title.
    /// </summary>
    [XmlElement(ElementName = "tittel", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? Tittel { get; set; }

    /// <summary>
    /// When the folder was created.
    /// </summary>
    [XmlElement(ElementName = "opprettetDato", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? OpprettetDato { get; set; }

    /// <summary>
    /// Who created the folder.
    /// </summary>
    [XmlElement(ElementName = "opprettetAv", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? OpprettetAv { get; set; }

    /// <summary>
    /// The classifications applied to the folder.
    /// </summary>
    [XmlElement(ElementName = "klassifikasjon", Namespace = ArkivmeldingNamespaces.Noark5)]
    public List<Klassifikasjon>? Klassifikasjon { get; set; }

    /// <summary>
    /// The registrations held by the folder — a journalpost per archived registration.
    /// </summary>
    /// <remarks>Repeatable, per the schema's <c>mappe</c> type.</remarks>
    [XmlElement(ElementName = "basisregistrering", Namespace = ArkivmeldingNamespaces.Noark5)]
    public List<Basisregistrering>? Basisregistrering { get; set; }

    /// <summary>
    /// The case date.
    /// </summary>
    [XmlElement(ElementName = "saksdato", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? Saksdato { get; set; }

    /// <summary>
    /// The administrative unit responsible for the folder.
    /// </summary>
    [XmlElement(ElementName = "administrativEnhet", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? AdministrativEnhet { get; set; }

    /// <summary>
    /// Who is responsible for the case.
    /// </summary>
    [XmlElement(ElementName = "saksansvarlig", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? Saksansvarlig { get; set; }

    /// <summary>
    /// The case status.
    /// </summary>
    [XmlElement(ElementName = "saksstatus", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? Saksstatus { get; set; }

    /// <summary>
    /// The XML schema instance type, which selects the concrete folder type.
    /// </summary>
    [XmlAttribute(AttributeName = "type", Namespace = ArkivmeldingNamespaces.XmlSchemaInstance)]
    public string? Type { get; set; }
}

/// <summary>
/// A classification applied to a folder.
/// </summary>
[XmlRoot(ElementName = "klassifikasjon", Namespace = ArkivmeldingNamespaces.Noark5)]
public sealed class Klassifikasjon
{
    /// <summary>
    /// A reference to the classification system.
    /// </summary>
    [XmlElement(ElementName = "referanseKlassifikasjonssystem", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? ReferanseKlassifikasjonssystem { get; set; }

    /// <summary>
    /// The class id.
    /// </summary>
    [XmlElement(ElementName = "klasseID", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? KlasseID { get; set; }

    /// <summary>
    /// The title.
    /// </summary>
    [XmlElement(ElementName = "tittel", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? Tittel { get; set; }

    /// <summary>
    /// When the classification was created.
    /// </summary>
    [XmlElement(ElementName = "opprettetDato", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? OpprettetDato { get; set; }

    /// <summary>
    /// Who created the classification.
    /// </summary>
    [XmlElement(ElementName = "opprettetAv", Namespace = ArkivmeldingNamespaces.Noark5)]
    public string? OpprettetAv { get; set; }
}
