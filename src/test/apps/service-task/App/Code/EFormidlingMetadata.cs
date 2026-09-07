using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features;

namespace Altinn.App.Code;

public class EFormidlingMetadata : IEFormidlingMetadata
{
    public async Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(
        IInstanceDataAccessor dataAccessor
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
                    Basisregistrering = new List<Basisregistrering>
                    {
                        new Basisregistrering
                        {
                            Type = "journalpost",
                            SystemID = Guid.NewGuid().ToString(),
                            OpprettetDato = DateTime.UtcNow,
                            OpprettetAv = "LandLord",
                            ArkivertDato = DateTime.Now,
                            ArkivertAv = "LandLord",
                            // A main document and an attachment, which is what AntallFiler claims. The
                            // model could only describe one of them until dokumentbeskrivelse became
                            // repeatable, as the schema has always allowed.
                            Dokumentbeskrivelse = new List<Dokumentbeskrivelse>
                            {
                                new Dokumentbeskrivelse
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
                                    Dokumentobjekt = new List<Dokumentobjekt>
                                    {
                                        new Dokumentobjekt
                                        {
                                            Versjonsnummer = 1,
                                            Variantformat = "Produksjonsformat",
                                            OpprettetDato = DateTime.UtcNow,
                                            OpprettetAv = "LandLord",
                                            ReferanseDokumentfil = "model.xml",
                                        },
                                    },
                                },
                                new Dokumentbeskrivelse
                                {
                                    SystemID = Guid.NewGuid().ToString(),
                                    Dokumenttype = "Bestilling",
                                    Dokumentstatus = "Dokumentet er ferdigstilt",
                                    Tittel = "Vedlegg",
                                    OpprettetDato = DateTime.UtcNow,
                                    OpprettetAv = "LandLord",
                                    TilknyttetRegistreringSom = "vedlegg",
                                    Dokumentnummer = 2,
                                    TilknyttetDato = DateTime.Now,
                                    TilknyttetAv = "Landlord",
                                    Dokumentobjekt = new List<Dokumentobjekt>
                                    {
                                        new Dokumentobjekt
                                        {
                                            Versjonsnummer = 1,
                                            Variantformat = "Arkivformat",
                                            OpprettetDato = DateTime.UtcNow,
                                            OpprettetAv = "LandLord",
                                            // The task ships two data types, model and ref-data-as-pdf.
                                            // A PDF data element with no filename is uploaded under its
                                            // data type id, which is what this refers to.
                                            ReferanseDokumentfil = "ref-data-as-pdf",
                                        },
                                    },
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
