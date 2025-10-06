using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Code;

public class EFormidlingMetadata : IEFormidlingMetadata
{
    public async Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(
        Instance instance
    )
    {
        var arkivmelding = new Arkivmelding
        {
            AntallFiler = 2,
            Tidspunkt = DateTime.Now.ToString(),
            MeldingId = Guid.NewGuid().ToString(),
            System = "LandLord",
            Mappe = new List<Mappe>
            {
                new Mappe
                {
                    SystemID = Guid.NewGuid().ToString(),
                    Tittel = "Dette er en tittel",
                    OpprettetDato = DateTime.Now.ToString(),
                    Type = "saksmappe",
                    Basisregistrering = new Basisregistrering
                    {
                        Type = "journalpost",
                        SystemID = Guid.NewGuid().ToString(),
                        OpprettetDato = DateTime.UtcNow,
                        OpprettetAv = "LandLord",
                        ArkivertDato = DateTime.Now,
                        ArkivertAv = "LandLord",
                        Dokumentbeskrivelse = new Dokumentbeskrivelse
                        {
                            SystemID = Guid.NewGuid().ToString(),
                            Dokumenttype = "Bestilling",
                            Dokumentstatus = "Dokumentet er ferdigstilt",
                            Tittel = "Hei",
                            OpprettetDato = DateTime.UtcNow,
                            OpprettetAv = "LandLord",
                            TilknyttetRegistreringSom = "hoveddokument",
                            Dokumentnummer = 1,
                            TilknyttetDato = DateTime.Now,
                            TilknyttetAv = "Landlord",
                            Dokumentobjekt = new Dokumentobjekt
                            {
                                Versjonsnummer = 1,
                                Variantformat = "Produksjonsformat",
                                OpprettetDato = DateTime.UtcNow,
                                OpprettetAv = "LandLord",
                                ReferanseDokumentfil = "skjema.xml",
                            },
                        },
                        Tittel = "Nye lysrør",
                        OffentligTittel = "Nye lysrør",
                        Journalposttype = "Utgående dokument",
                        Journalstatus = "Journalført",
                        Journaldato = DateTime.Now,
                    },
                },
            },
        };

        var stream = new MemoryStream();

        var serializer = new XmlSerializer(typeof(Arkivmelding));

        serializer.Serialize(stream, arkivmelding);
        stream.Position = 0;

        var streamContent = new StreamContent(stream);
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/xml");

        return await Task.FromResult(("arkivmelding.xml", stream));
    }
}
