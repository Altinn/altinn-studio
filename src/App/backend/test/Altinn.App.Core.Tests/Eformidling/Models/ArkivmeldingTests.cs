using System.Xml.Linq;
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
                    Basisregistrering = new Basisregistrering
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
}
