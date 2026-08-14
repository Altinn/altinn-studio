using System.Reflection;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using System.Xml.Serialization;
using Altinn.App.Core.EFormidling.Models;

namespace Altinn.App.Core.Tests.Eformidling.Models;

/// <summary>
/// Guards the arkivmelding model against the Noark 5 schema it is generated from
/// (<c>http://www.arkivverket.no/standarder/noark5/arkivmelding</c>). The receiving archive validates
/// what we send, so cardinality and element order are contract, not style.
/// </summary>
public class ArkivmeldingTests
{
    private static readonly XNamespace _noark = ArkivmeldingNamespaces.Noark5;

    private static Arkivmelding BuildWithTwoDocuments() =>
        new()
        {
            System = "test",
            MeldingId = Guid.NewGuid().ToString(),
            Tidspunkt = DateTime.UtcNow.ToString("o"),
            AntallFiler = 2,
            Mappe =
            [
                new Mappe
                {
                    SystemID = Guid.NewGuid().ToString(),
                    Tittel = "Sak",
                    Type = "saksmappe",
                    Basisregistrering =
                    [
                        new Basisregistrering
                        {
                            Type = "journalpost",
                            SystemID = Guid.NewGuid().ToString(),
                            Tittel = "Journalpost",
                            Dokumentbeskrivelse =
                            [
                                new Dokumentbeskrivelse
                                {
                                    Tittel = "Hoveddokument",
                                    TilknyttetRegistreringSom = "hoveddokument",
                                    Dokumentnummer = 1,
                                    Dokumentobjekt =
                                    [
                                        new Dokumentobjekt { ReferanseDokumentfil = "model.xml" },
                                        new Dokumentobjekt { ReferanseDokumentfil = "model.pdf" },
                                    ],
                                },
                                new Dokumentbeskrivelse
                                {
                                    Tittel = "Vedlegg",
                                    TilknyttetRegistreringSom = "vedlegg",
                                    Dokumentnummer = 2,
                                    Dokumentobjekt = [new Dokumentobjekt { ReferanseDokumentfil = "vedlegg.pdf" }],
                                },
                            ],
                        },
                    ],
                },
            ],
        };

    private static XDocument Serialize(Arkivmelding arkivmelding)
    {
        var serializer = new XmlSerializer(typeof(Arkivmelding));
        using var buffer = new MemoryStream();
        serializer.Serialize(buffer, arkivmelding);
        buffer.Position = 0;
        return XDocument.Load(buffer);
    }

    [Fact]
    public void A_journalpost_can_carry_a_main_document_and_its_attachments()
    {
        // The schema declares dokumentbeskrivelse maxOccurs="unbounded"; before it was a list, a
        // shipment could only ever describe one document.
        XDocument document = Serialize(BuildWithTwoDocuments());

        List<XElement> descriptions = [.. document.Descendants(_noark + "dokumentbeskrivelse")];

        Assert.Equal(2, descriptions.Count);
        Assert.Equal(["Hoveddokument", "Vedlegg"], descriptions.Select(d => d.Element(_noark + "tittel")?.Value));
    }

    [Fact]
    public void A_document_description_can_carry_several_objects()
    {
        XDocument document = Serialize(BuildWithTwoDocuments());

        XElement main = document.Descendants(_noark + "dokumentbeskrivelse").First();
        List<string?> files =
        [
            .. main.Elements(_noark + "dokumentobjekt").Select(o => o.Element(_noark + "referanseDokumentfil")?.Value),
        ];

        Assert.Equal(["model.xml", "model.pdf"], files);
    }

    [Fact]
    public void Repeated_elements_are_emitted_without_a_wrapper()
    {
        // A wrapper element would be schema-invalid, and is what XmlSerializer emits by default for a
        // collection that is not annotated with XmlElement.
        XDocument document = Serialize(BuildWithTwoDocuments());

        Assert.Empty(document.Descendants(_noark + "dokumentbeskrivelser"));
        Assert.Empty(document.Descendants(_noark + "dokumentobjekter"));
    }

    [Fact]
    public void Documents_are_written_before_the_title_of_their_registration()
    {
        // Not cosmetic: dokumentbeskrivelse belongs to the schema's `registrering` type and tittel to
        // `basisregistrering`, which extends it — and an XSD extension appends to its parent's
        // sequence. Declaring the properties in the other order would emit invalid XML.
        XDocument document = Serialize(BuildWithTwoDocuments());

        XElement registration = document.Descendants(_noark + "basisregistrering").Single();
        List<string> childOrder = [.. registration.Elements().Select(e => e.Name.LocalName)];

        Assert.True(
            childOrder.IndexOf("dokumentbeskrivelse") < childOrder.IndexOf("tittel"),
            $"dokumentbeskrivelse must precede tittel, but order was: {string.Join(", ", childOrder)}"
        );
    }

    [Fact]
    public void A_complete_shipment_validates_against_the_Noark_5_schema()
    {
        // The guard the hand-written assertions above cannot be: element order, cardinality and data
        // types all checked at once, by the schema itself rather than by our reading of it. Several of
        // these types arrived sorted by member name, which emits the elements out of sequence.
        XDocument document = Serialize(BuildCompleteShipment());

        List<string> problems = [];
        document.Validate(
            NoarkSchemas(),
            (_, e) => problems.Add($"{e.Severity} at line {e.Exception?.LineNumber}: {e.Message}"),
            addSchemaInfo: false
        );

        // Warnings count too: the most likely one here is "no schema found for element", which means
        // the document was never really checked.
        Assert.True(
            problems.Count == 0,
            $"Schema validation failed:{Environment.NewLine}{string.Join(Environment.NewLine, problems)}"
        );
    }

    [Fact]
    public Task The_serialized_shipment_has_a_stable_shape()
    {
        // Schema validity is necessary but not sufficient: plenty of wrong documents are still valid
        // — an optional element silently dropped, a value changed, elements reordered within what the
        // schema permits. This pins the exact bytes so any such change shows up in review as a diff
        // rather than being invisible. It is also the guard that would have made the members-sorted-
        // by-name ordering obvious to a reader.
        //
        // The snapshot records current behaviour, warts included: `arkivertDato` is optional in the
        // schema but a non-nullable DateTime here, so it is emitted as 0001-01-01 even when the
        // shipment never set it. Schema-valid, semantically junk, and invisible to the validator.
        XDocument document = Serialize(BuildCompleteShipment());

        return Verify(document.ToString()).UseDirectory(".Verify");
    }

    [Fact]
    public void The_schema_validation_is_not_vacuous()
    {
        // If the schema set failed to associate with the document's namespace, Validate would report
        // nothing and the test above would pass without checking anything. This proves it bites: the
        // minimal fixture omits elements the schema requires.
        XDocument document = Serialize(BuildWithTwoDocuments());

        List<XmlSeverityType> severities = [];
        document.Validate(NoarkSchemas(), (_, e) => severities.Add(e.Severity), addSchemaInfo: false);

        Assert.Contains(XmlSeverityType.Error, severities);
    }

    /// <summary>
    /// Loads the schema pair embedded in this test project. The arkivmelding schema imports the
    /// metadata catalogue by relative path, so both are added to the set explicitly rather than left
    /// to a resolver that would try to reach the filesystem.
    /// </summary>
    /// <remarks>
    /// The schemas are unmodified upstream copies, retrieved 2026-08-13 from Arkivverket's Noark 5
    /// schemas as published by difi/felleslosninger:
    /// <see href="https://github.com/difi/felleslosninger/tree/gh-pages/resources/arkivmelding"/>.
    /// See the <c>EmbeddedResource</c> block in the test project file for the exact source URLs.
    /// </remarks>
    private static XmlSchemaSet NoarkSchemas()
    {
        var schemas = new XmlSchemaSet { XmlResolver = null };
        Add("metadatakatalog.xsd", "http://www.arkivverket.no/standarder/noark5/metadatakatalog");
        Add("arkivmelding.xsd", ArkivmeldingNamespaces.Noark5);
        schemas.Compile();
        return schemas;

        void Add(string filename, string targetNamespace)
        {
            string resource = $"Altinn.App.Core.Tests.Eformidling.Models.Schema.{filename}";
            using Stream stream =
                Assembly.GetExecutingAssembly().GetManifestResourceStream(resource)
                ?? throw new InvalidOperationException($"Embedded schema '{resource}' was not found.");
            using XmlReader reader = XmlReader.Create(stream);
            schemas.Add(targetNamespace, reader);
        }
    }

    /// <summary>
    /// Every element the schema makes mandatory, with values its enumerations accept — the smallest
    /// document that proves the model can express a valid shipment at all.
    /// </summary>
    /// <remarks>
    /// Deterministic: fixed ids and a fixed clock, so the serialized form can be snapshotted. The ids
    /// still satisfy the schema's GUID pattern.
    /// </remarks>
    private static Arkivmelding BuildCompleteShipment()
    {
        DateTime now = new(2026, 8, 13, 10, 30, 0, DateTimeKind.Utc);
        const string folderId = "11111111-1111-1111-1111-111111111111";

        return new Arkivmelding
        {
            System = "Altinn",
            MeldingId = "00000000-0000-0000-0000-000000000001",
            Tidspunkt = now.ToString("o"),
            AntallFiler = 1,
            Mappe =
            [
                new Mappe
                {
                    SystemID = folderId,
                    Tittel = "Sak",
                    OpprettetDato = now.ToString("o"),
                    OpprettetAv = "Altinn",
                    Type = "saksmappe",
                    Basisregistrering =
                    [
                        new Basisregistrering
                        {
                            Type = "journalpost",
                            SystemID = "22222222-2222-2222-2222-222222222222",
                            OpprettetDato = now,
                            OpprettetAv = "Altinn",
                            ReferanseForelderMappe = folderId,
                            Dokumentbeskrivelse =
                            [
                                new Dokumentbeskrivelse
                                {
                                    SystemID = "33333333-3333-3333-3333-333333333333",
                                    Dokumenttype = "Bestilling",
                                    Dokumentstatus = "Dokumentet er ferdigstilt",
                                    Tittel = "Hoveddokument",
                                    OpprettetDato = now,
                                    OpprettetAv = "Altinn",
                                    TilknyttetRegistreringSom = "Hoveddokument",
                                    Dokumentnummer = 1,
                                    TilknyttetDato = now,
                                    TilknyttetAv = "Altinn",
                                    Dokumentobjekt =
                                    [
                                        new Dokumentobjekt
                                        {
                                            Versjonsnummer = 1,
                                            Variantformat = "Produksjonsformat",
                                            OpprettetDato = now,
                                            OpprettetAv = "Altinn",
                                            ReferanseDokumentfil = "model.xml",
                                        },
                                    ],
                                },
                            ],
                            Tittel = "Journalpost",
                            Journalposttype = "Utgående dokument",
                            Journalstatus = "Journalført",
                            Journaldato = now,
                            Korrespondansepart =
                            [
                                new Korrespondansepart
                                {
                                    Korrespondanseparttype = "Avsender",
                                    KorrespondansepartNavn = "Digitaliseringsdirektoratet",
                                },
                                new Korrespondansepart
                                {
                                    Korrespondanseparttype = "Mottaker",
                                    KorrespondansepartNavn = "Oslo kommune",
                                },
                            ],
                        },
                    ],
                    Saksdato = now.ToString("yyyy-MM-dd"),
                    AdministrativEnhet = "Digitaliseringsdirektoratet",
                    Saksansvarlig = "Altinn",
                    Saksstatus = "Under behandling",
                },
            ],
        };
    }
}
