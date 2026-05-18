using System.Text.Json;
using Altinn.Augmenter.Agent.Pipelines.Generic;
using Altinn.Augmenter.Agent.Services.Domain;

namespace Altinn.Augmenter.Agent.Pipelines.Checklist;

public sealed class ChecklistDataMapper(DomainDataProvider domainData) : IDataMapper
{
    public JsonDocument Map(JsonElement flatData)
    {
        using var stream = new MemoryStream();
        using var writer = new Utf8JsonWriter(stream);

        writer.WriteStartObject();

        WriteMeta(writer, flatData);
        WriteSoker(writer, flatData);
        WriteArrangement(writer, flatData);
        WriteBevilling(writer, flatData);
        WriteStyrer(writer, flatData);
        WriteStedfortreder(writer, flatData);
        WriteSjekkliste(writer);

        writer.WriteEndObject();
        writer.Flush();

        stream.Position = 0;
        return JsonDocument.Parse(stream);
    }

    private void WriteMeta(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("meta");
        writer.WriteString("saksnummer", "–");
        writer.WriteString("soknadsdato", "–");
        writer.WriteString("vurderingsdato", DateTime.UtcNow.ToString("yyyy-MM-dd"));
        writer.WriteString("saksbehandler", "AI-agent");
        writer.WriteString("soknadstype", GetString(flatData, "BevillingsType") ?? "ukjent");
        writer.WriteString("kommune", GetKommune(flatData));
        writer.WriteEndObject();
    }

    private static void WriteSoker(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("soker");

        var orgNavn = (string?)null;
        var orgNr = (string?)null;

        if (TryGet(flatData, "OrganisasjonsInformasjon", out var orgInfo))
        {
            orgNavn = GetString(orgInfo, "Navn");
            orgNr = GetString(orgInfo, "Organisasjonsnummer");
        }

        var brukerType = GetString(flatData, "BrukerType");
        var isPrivatperson = string.Equals(brukerType, "person", StringComparison.OrdinalIgnoreCase)
                             || string.IsNullOrEmpty(orgNavn);

        if (isPrivatperson)
        {
            var innsenderNavn = GetInnsenderNavn(flatData);
            writer.WriteString("navn", innsenderNavn != "–" ? innsenderNavn : "Privatperson");
        }
        else
        {
            writer.WriteString("navn", orgNavn);
        }

        writer.WriteString("organisasjonsnummer", orgNr ?? "–");
        writer.WriteString("kontaktperson", GetInnsenderNavn(flatData));
        writer.WriteString("adresse", "–");
        writer.WriteEndObject();
    }

    private static void WriteArrangement(Utf8JsonWriter writer, JsonElement flatData)
    {
        if (!TryGet(flatData, "Arrangement", out var arrangement))
            return;

        writer.WriteStartObject("arrangement");

        var stedsNavn = "Ukjent";
        var stedsAdresse = "–";
        if (TryGet(arrangement, "Arrangementssted", out var sted))
        {
            stedsNavn = GetString(sted, "StedsNavn") ?? stedsNavn;
            if (TryGet(sted, "StedsAdresse", out var adr))
            {
                stedsAdresse = GetString(adr, "Gateadresse") ?? stedsAdresse;
            }
        }

        writer.WriteString("navn", GetString(arrangement, "Navn") ?? "–");
        writer.WriteString("type", GetString(arrangement, "ArrangementType") ?? GetString(arrangement, "Type") ?? "–");

        var fraDato = "–";
        var tilDato = "–";
        var fraKlokkeslett = "–";
        var tilKlokkeslett = "–";
        if (TryGet(arrangement, "ArrangementPeriode", out var perioder) &&
            perioder.ValueKind == JsonValueKind.Array &&
            perioder.GetArrayLength() > 0)
        {
            var forstePeriode = perioder[0];
            fraDato = GetString(forstePeriode, "StartDato") ?? fraDato;
            tilDato = GetString(forstePeriode, "SluttDato") ?? fraDato;
            fraKlokkeslett = GetString(forstePeriode, "StartTid") ?? fraKlokkeslett;
            tilKlokkeslett = GetString(forstePeriode, "SluttTid") ?? tilKlokkeslett;
        }

        writer.WriteString("fra_dato", fraDato);
        writer.WriteString("fra_klokkeslett", fraKlokkeslett);
        writer.WriteString("til_dato", tilDato);
        writer.WriteString("til_klokkeslett", tilKlokkeslett);
        writer.WriteNumber("antall_deltakere", ParseInt(GetString(arrangement, "AntallDeltakere")));

        var typeDeltakere = GetString(arrangement, "TypeDeltakere");
        var aapenEllerLukket = string.Equals(typeDeltakere, "bestemtePersoner", StringComparison.OrdinalIgnoreCase)
            ? "Lukket" : "Åpent";
        writer.WriteString("aapen_eller_lukket", aapenEllerLukket);

        var stedsType = "–";
        if (TryGet(arrangement, "Arrangementssted", out var arrangementssted))
            stedsType = GetString(arrangementssted, "Type") ?? "–";
        var innendorsUtendors = stedsType switch
        {
            "innendoers" => "Innendørs",
            "utendoers" => "Utendørs",
            _ => stedsType,
        };
        writer.WriteString("innendors_utendors", innendorsUtendors);
        writer.WriteString("lokale_navn", stedsNavn);
        writer.WriteString("lokale_adresse", stedsAdresse);

        writer.WriteEndObject();
    }

    private void WriteBevilling(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("bevilling");

        var bevillingsType = GetString(flatData, "BevillingsType") ?? "ukjent";
        writer.WriteString("type_bevilling", bevillingsType);

        var varegruppe = TryGet(flatData, "Arrangement", out var arr)
            ? GetString(arr, "VaregruppeAlkohol")
            : null;
        writer.WriteString("alkoholgruppe", domainData.MapAlkoholgruppeChecklist(varegruppe));

        var harEksisterende = false;
        if (flatData.TryGetProperty("SkalFornyeBevilling", out var fornyProp) &&
            fornyProp.ValueKind == JsonValueKind.True)
            harEksisterende = true;
        writer.WriteBoolean("har_eksisterende_bevilling", harEksisterende);

        writer.WriteEndObject();
    }

    private static void WriteStyrer(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("styrer");

        if (TryGet(flatData, "Bevillingsansvarlig", out var ansvarlig) &&
            TryGet(ansvarlig, "Styrer", out var styrer))
        {
            writer.WriteString("navn", BuildFulltNavn(styrer));
            writer.WriteString("fodselsnummer", GetString(styrer, "Foedselsnummer") ?? "–");
            writer.WriteString("epost", GetString(styrer, "EPostadresse") ?? "–");
            writer.WriteString("telefon", GetString(styrer, "Telefonnummer") ?? "–");
        }
        else
        {
            writer.WriteString("navn", "Ikke oppgitt");
            writer.WriteString("fodselsnummer", "–");
            writer.WriteString("epost", "–");
            writer.WriteString("telefon", "–");
        }

        writer.WriteEndObject();
    }

    private static void WriteStedfortreder(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("stedfortreder");

        var fritakSokt = false;
        if (TryGet(flatData, "Bevillingsansvarlig", out var ansvarlig))
        {
            if (ansvarlig.TryGetProperty("SkalHaFritakFraStedfortreder", out var fritakProp) &&
                fritakProp.ValueKind == JsonValueKind.True)
                fritakSokt = true;

            if (TryGet(ansvarlig, "Stedfortreder", out var stedfortreder))
            {
                writer.WriteString("navn", BuildFulltNavn(stedfortreder));
                writer.WriteString("fodselsnummer", GetString(stedfortreder, "Foedselsnummer") ?? "–");
                writer.WriteString("epost", GetString(stedfortreder, "EPostadresse") ?? "–");
                writer.WriteString("telefon", GetString(stedfortreder, "Telefonnummer") ?? "–");
                writer.WriteBoolean("fritak_sokt", fritakSokt);
            }
            else
            {
                writer.WriteString("navn", "Ikke oppgitt");
                writer.WriteString("fodselsnummer", "–");
                writer.WriteString("epost", "–");
                writer.WriteString("telefon", "–");
                writer.WriteBoolean("fritak_sokt", fritakSokt);
            }
        }
        else
        {
            writer.WriteString("navn", "Ikke oppgitt");
            writer.WriteString("fodselsnummer", "–");
            writer.WriteString("epost", "–");
            writer.WriteString("telefon", "–");
            writer.WriteBoolean("fritak_sokt", false);
        }

        writer.WriteEndObject();
    }

    private void WriteSjekkliste(Utf8JsonWriter writer)
    {
        var sjekkliste = domainData.Sjekkliste;
        writer.WriteStartObject("sjekkliste");

        foreach (var seksjon in sjekkliste.Seksjoner)
        {
            writer.WriteStartObject(seksjon.Id);
            writer.WriteString("label", seksjon.Label);

            writer.WriteStartObject("punkter");
            foreach (var punkt in seksjon.Punkter)
            {
                writer.WriteStartObject(punkt.Id);
                writer.WriteString("label", punkt.Label);
                writer.WriteString("status", sjekkliste.DefaultStatus);
                writer.WriteString("merknad", "");
                writer.WriteEndObject();
            }
            writer.WriteEndObject();

            writer.WriteEndObject();
        }

        writer.WriteEndObject();
    }

    private string GetKommune(JsonElement flatData)
    {
        var knr = ExtractKommunenummer(flatData);
        if (knr != null && domainData.Kommuner.Kommuner.TryGetValue(knr, out var entry))
            return entry.Navn;

        // Fall back to any string-form "Kommune" field found in the application
        if (TryGet(flatData, "Arrangement", out var arrangement) &&
            TryGet(arrangement, "Arrangementssted", out var sted))
        {
            var kommune = GetString(sted, "Kommune");
            if (kommune != null) return kommune;
        }

        if (TryGet(flatData, "StedsOpplysninger", out var stedsOpplysninger))
        {
            var kommune = GetString(stedsOpplysninger, "Kommune");
            if (kommune != null) return kommune;
        }

        return "–";
    }

    private static string? ExtractKommunenummer(JsonElement flatData)
    {
        var direct = GetString(flatData, "Kommunenummer");
        if (direct != null) return direct;

        if (TryGet(flatData, "Arrangement", out var arrangement) &&
            TryGet(arrangement, "Arrangementssted", out var sted) &&
            TryGet(sted, "StedsAdresse", out var stedsAdr))
        {
            var knr = GetString(stedsAdr, "Kommunenummer");
            if (knr != null) return knr;
        }

        if (TryGet(flatData, "Innsender", out var innsender) &&
            TryGet(innsender, "Adresse", out var adr))
        {
            var knr = GetString(adr, "Kommunenummer");
            if (knr != null) return knr;
        }

        return null;
    }

    private static string GetInnsenderNavn(JsonElement flatData)
    {
        if (TryGet(flatData, "Innsender", out var innsender))
        {
            var fulltNavn = GetString(innsender, "FulltNavn");
            if (fulltNavn != null)
                return fulltNavn;
            return BuildFulltNavn(innsender);
        }
        return "–";
    }

    private static int ParseInt(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return 0;
        return int.TryParse(value, out var result) ? result : 0;
    }

    private static string BuildFulltNavn(JsonElement person)
    {
        var fulltNavn = GetString(person, "FulltNavn");
        if (fulltNavn != null)
            return fulltNavn;

        var parts = new[] { GetString(person, "Fornavn"), GetString(person, "Mellomnavn"), GetString(person, "Etternavn") }
            .Where(p => !string.IsNullOrWhiteSpace(p));

        var joined = string.Join(" ", parts);
        return string.IsNullOrEmpty(joined) ? "Ukjent" : joined;
    }

    private static string? GetString(JsonElement element, string propertyName)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return null;

        if (!element.TryGetProperty(propertyName, out var prop))
            return null;

        return prop.ValueKind == JsonValueKind.String ? prop.GetString() : null;
    }

    private static bool TryGet(JsonElement element, string propertyName, out JsonElement value)
    {
        value = default;
        if (element.ValueKind != JsonValueKind.Object)
            return false;
        if (!element.TryGetProperty(propertyName, out var prop))
            return false;
        if (prop.ValueKind == JsonValueKind.Null)
            return false;
        value = prop;
        return true;
    }
}
