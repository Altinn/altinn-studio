using System;
using System.Collections.Generic;
using System.Text;
using System.Xml.Serialization;

namespace Altinn.EFormidlingClient.Models.Arkivmelding2
{
    // using System.Xml.Serialization;
    // XmlSerializer serializer = new XmlSerializer(typeof(Arkivmelding));
    // using (StringReader reader = new StringReader(xml))
    // {
    //    var test = (Arkivmelding)serializer.Deserialize(reader);
    // }

    /// <summary>
    /// </summary>
    ///

#pragma warning disable SA1600 // Elements should be documented
#pragma warning disable SA1606 // Element documentation should have summary text
    [XmlRoot(ElementName = "arkivmelding")]
    public class Arkivmelding
    {
        [XmlElement(ElementName = "system")]
        public string System { get; set; }

        [XmlElement(ElementName = "meldingId")]
        public string MeldingId { get; set; }

        [XmlElement(ElementName = "tidspunkt")]
        public DateTime Tidspunkt { get; set; }

        [XmlElement(ElementName = "antallFiler")]
        public int AntallFiler { get; set; }

        [XmlElement(ElementName = "mappe")]
        public Mappe Mappe { get; set; }

        [XmlAttribute(AttributeName = "xmlns")]
        public List<string> Xmlns { get; set; }

        [XmlAttribute(AttributeName = "xsi")]
        public string Xsi { get; set; }

        [XmlAttribute(AttributeName = "schemaLocation")]
        public string SchemaLocation { get; set; }

        [XmlText]
        public string Text { get; set; }
    }

    [XmlRoot(ElementName = "klassifikasjon")]
    public class Klassifikasjon
    {
        [XmlElement(ElementName = "referanseKlassifikasjonssystem")]
        public string ReferanseKlassifikasjonssystem { get; set; }

        [XmlElement(ElementName = "klasseID")]
        public string KlasseID { get; set; }

        [XmlElement(ElementName = "tittel")]
        public string Tittel { get; set; }

        [XmlElement(ElementName = "opprettetDato")]
        public DateTime OpprettetDato { get; set; }

        [XmlElement(ElementName = "opprettetAv")]
        public string OpprettetAv { get; set; }
    }

    [XmlRoot(ElementName = "dokumentobjekt")]
    public class Dokumentobjekt
    {
        [XmlElement(ElementName = "versjonsnummer")]
        public int Versjonsnummer { get; set; }

        [XmlElement(ElementName = "variantformat")]
        public string Variantformat { get; set; }

        [XmlElement(ElementName = "opprettetDato")]
        public DateTime OpprettetDato { get; set; }

        [XmlElement(ElementName = "opprettetAv")]
        public string OpprettetAv { get; set; }

        [XmlElement(ElementName = "referanseDokumentfil")]
        public string ReferanseDokumentfil { get; set; }
    }

    [XmlRoot(ElementName = "dokumentbeskrivelse")]
    public class Dokumentbeskrivelse
    {
        [XmlElement(ElementName = "systemID")]
        public string SystemID { get; set; }

        [XmlElement(ElementName = "dokumenttype")]
        public string Dokumenttype { get; set; }

        [XmlElement(ElementName = "dokumentstatus")]
        public string Dokumentstatus { get; set; }

        [XmlElement(ElementName = "tittel")]
        public string Tittel { get; set; }

        [XmlElement(ElementName = "opprettetDato")]
        public DateTime OpprettetDato { get; set; }

        [XmlElement(ElementName = "opprettetAv")]
        public string OpprettetAv { get; set; }

        [XmlElement(ElementName = "tilknyttetRegistreringSom")]
        public string TilknyttetRegistreringSom { get; set; }

        [XmlElement(ElementName = "dokumentnummer")]
        public int Dokumentnummer { get; set; }

        [XmlElement(ElementName = "tilknyttetDato")]
        public DateTime TilknyttetDato { get; set; }

        [XmlElement(ElementName = "tilknyttetAv")]
        public string TilknyttetAv { get; set; }

        [XmlElement(ElementName = "dokumentobjekt")]
        public Dokumentobjekt Dokumentobjekt { get; set; }
    }

    [XmlRoot(ElementName = "virksomhetsspesifikkeMetadata")]
    public class VirksomhetsspesifikkeMetadata
    {
        [XmlElement(ElementName = "forvaltningsnummer")]
        public int Forvaltningsnummer { get; set; }

        [XmlElement(ElementName = "objektnavn")]
        public string Objektnavn { get; set; }

        [XmlElement(ElementName = "eiendom")]
        public int Eiendom { get; set; }

        [XmlElement(ElementName = "bygning")]
        public int Bygning { get; set; }

        [XmlElement(ElementName = "bestillingtype")]
        public string Bestillingtype { get; set; }

        [XmlElement(ElementName = "rammeavtale")]
        public string Rammeavtale { get; set; }
    }

    [XmlRoot(ElementName = "korrespondansepart")]
    public class Korrespondansepart
    {
        [XmlElement(ElementName = "korrespondanseparttype")]
        public string Korrespondanseparttype { get; set; }

        [XmlElement(ElementName = "korrespondansepartNavn")]
        public string KorrespondansepartNavn { get; set; }
    }

    [XmlRoot(ElementName = "basisregistrering")]
    public class Basisregistrering
    {
        [XmlElement(ElementName = "systemID")]
        public string SystemID { get; set; }

        [XmlElement(ElementName = "opprettetDato")]
        public DateTime OpprettetDato { get; set; }

        [XmlElement(ElementName = "opprettetAv")]
        public string OpprettetAv { get; set; }

        [XmlElement(ElementName = "arkivertDato")]
        public DateTime ArkivertDato { get; set; }

        [XmlElement(ElementName = "arkivertAv")]
        public string ArkivertAv { get; set; }

        [XmlElement(ElementName = "referanseForelderMappe")]
        public string ReferanseForelderMappe { get; set; }

        [XmlElement(ElementName = "dokumentbeskrivelse")]
        public Dokumentbeskrivelse Dokumentbeskrivelse { get; set; }

        [XmlElement(ElementName = "tittel")]
        public string Tittel { get; set; }

        [XmlElement(ElementName = "offentligTittel")]
        public string OffentligTittel { get; set; }

        [XmlElement(ElementName = "virksomhetsspesifikkeMetadata")]
        public VirksomhetsspesifikkeMetadata VirksomhetsspesifikkeMetadata { get; set; }

        [XmlElement(ElementName = "journalposttype")]
        public string Journalposttype { get; set; }

        [XmlElement(ElementName = "journalstatus")]
        public string Journalstatus { get; set; }

        [XmlElement(ElementName = "journaldato")]
        public DateTime Journaldato { get; set; }

        [XmlElement(ElementName = "korrespondansepart")]
        public Korrespondansepart Korrespondansepart { get; set; }

        [XmlAttribute(AttributeName = "type")]
        public string Type { get; set; }

        [XmlText]
        public string Text { get; set; }
    }

    [XmlRoot(ElementName = "mappe")]
    public class Mappe
    {
        [XmlElement(ElementName = "systemID")]
        public string SystemID { get; set; }

        [XmlElement(ElementName = "tittel")]
        public string Tittel { get; set; }

        [XmlElement(ElementName = "opprettetDato")]
        public DateTime OpprettetDato { get; set; }

        [XmlElement(ElementName = "opprettetAv")]
        public object OpprettetAv { get; set; }

        [XmlElement(ElementName = "klassifikasjon")]
        public List<Klassifikasjon> Klassifikasjon { get; set; }

        [XmlElement(ElementName = "basisregistrering")]
        public Basisregistrering Basisregistrering { get; set; }

        [XmlElement(ElementName = "saksdato")]
        public DateTime Saksdato { get; set; }

        [XmlElement(ElementName = "administrativEnhet")]
        public string AdministrativEnhet { get; set; }

        [XmlElement(ElementName = "saksansvarlig")]
        public string Saksansvarlig { get; set; }

        [XmlElement(ElementName = "saksstatus")]
        public string Saksstatus { get; set; }

        [XmlAttribute(AttributeName = "type")]
        public string Type { get; set; }

        [XmlText]
        public string Text { get; set; }
    }

#pragma warning restore SA1600 // Elements should be documented
#pragma warning restore SA1606 // Element documentation should have summary text

}
