using System.Text;
using Altinn.App.Clients.Fiks.Extensions;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;
using KS.Fiks.Arkiv.Models.V1.Kodelister;
using KS.Fiks.Arkiv.Models.V1.Metadatakatalog;

namespace Altinn.App.Clients.Fiks.Tests.Extensions;

public class ArkivmeldingExtensionsTests
{
    [Fact]
    public async Task SerializeXmlBytes_SerializesCorrectly()
    {
        // Arrange
        var theDate = DateTime.Parse("2025-01-01T00:00:00Z");
        var caseFile = new Saksmappe
        {
            Tittel = "folder-title",
            OffentligTittel = "folder-public-title",
            AdministrativEnhet = new AdministrativEnhet { Navn = "folder-creator" },
            Saksaar = theDate.Year,
            Saksdato = theDate,
            ReferanseEksternNoekkel = new EksternNoekkel
            {
                Fagsystem = "folder-external-system",
                Noekkel = "folder-external-system-id",
            },
        };
        var archiveRecord = new Arkivmelding
        {
            System = "record-system-id",
            Regel = "record-rule-id",
            AntallFiler = 2,
            Mappe = caseFile,
            Registrering = new Journalpost
            {
                Journalaar = theDate.Year,
                DokumentetsDato = theDate,
                // SendtDato = theDate,
                Tittel = "journal-entry-title",
                OffentligTittel = "journal-entry-public-title",
                OpprettetAv = "journal-entry-creator",
                ArkivertAv = "journal-entry-archivist",
                Journalstatus = new Journalstatus
                {
                    KodeProperty = JournalstatusKoder.Journalfoert.Verdi,
                    Beskrivelse = JournalstatusKoder.Journalfoert.Beskrivelse,
                },
                Journalposttype = new Journalposttype
                {
                    KodeProperty = JournalposttypeKoder.UtgaaendeDokument.Verdi,
                    Beskrivelse = JournalposttypeKoder.UtgaaendeDokument.Beskrivelse,
                },
                ReferanseForelderMappe = new ReferanseTilMappe
                {
                    ReferanseEksternNoekkel = caseFile.ReferanseEksternNoekkel,
                },
                ReferanseEksternNoekkel = caseFile.ReferanseEksternNoekkel,
            },
        };

        // Act
        var result = archiveRecord.SerializeXml(indent: true);
        var xml = Encoding.UTF8.GetString(result.Span);

        // Assert
        await Verify(xml).UseDefaultSettings();
    }

    [Fact]
    public async Task ToPayload_ReturnsCorrectPayload()
    {
        // Arrange
        var archiveRecord = new Arkivmelding();

        // Act
        var result = archiveRecord.ToPayload();
        using var reader = new StreamReader(result.Data);
        var xml = await reader.ReadToEndAsync();

        // Assert
        Assert.Equal("arkivmelding.xml", result.Filename);
        await Verify(xml).UseDefaultSettings();
    }
}
