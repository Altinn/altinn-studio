using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Checklist;

public sealed class ChecklistDataMapper : IChecklistDataMapper
{
    private const string DefaultStatus = "ikke_vurdert";

    private static readonly Dictionary<string, string> KommuneMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["4204"] = "Kristiansand",
        ["4223"] = "Vennesla",
    };

    public JsonDocument MapToChecklist(JsonElement flatData)
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

    private static void WriteMeta(Utf8JsonWriter writer, JsonElement flatData)
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

    private static void WriteBevilling(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("bevilling");

        var bevillingsType = GetString(flatData, "BevillingsType") ?? "ukjent";
        writer.WriteString("type_bevilling", bevillingsType);

        var alkoholgruppe = "–";
        if (TryGet(flatData, "Arrangement", out var arr))
        {
            var varegruppe = GetString(arr, "VaregruppeAlkohol");
            if (varegruppe != null)
            {
                var normalized = varegruppe.ToLowerInvariant();
                if (normalized.Contains("tre") || normalized.Contains("3"))
                    alkoholgruppe = "Gruppe 1, 2 og 3 (inntil 60 %)";
                else if (normalized.Contains("to") || normalized.Contains("2"))
                    alkoholgruppe = "Gruppe 1 og 2 (under 22 %)";
                else
                    alkoholgruppe = "Gruppe 1 (2,5–4,7 %)";
            }
        }
        writer.WriteString("alkoholgruppe", alkoholgruppe);

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

    private static void WriteSjekkliste(Utf8JsonWriter writer)
    {
        writer.WriteStartObject("sjekkliste");

        WriteSection(writer, "formelle_krav", "Formelle krav",
            ("soknad_komplett", "Søknaden er komplett utfylt"),
            ("riktig_soknadstype", "Riktig søknadstype valgt"),
            ("kommune_riktig", "Riktig kommune valgt"),
            ("soker_identifisert", "Søker er identifisert med org.nr."));

        WriteSection(writer, "dokumentasjon", "Dokumentasjon",
            ("leiekontrakt", "Leiekontrakt for lokalet"),
            ("personantall_beregning", "Beregning av personantall fra godkjent firma"),
            ("plantegninger", "Plantegninger over lokalet"),
            ("mattilsynet_registrering", "Registrering hos Mattilsynet"),
            ("bruksgodkjenning", "Bruksgodkjenning fra plan- og bygningsetaten"),
            ("kunnskapsprove_styrer", "Kunnskapsprøve bestått – styrer"),
            ("kunnskapsprove_stedfortreder", "Kunnskapsprøve bestått – stedfortreder"),
            ("arbeidsavtale_styrer", "Arbeidsavtale for styrer"),
            ("arbeidsavtale_stedfortreder", "Arbeidsavtale for stedfortreder"));

        WriteSection(writer, "vandel", "Vandelsvurdering",
            ("politi_uttalelse", "Uttalelse innhentet fra politiet"),
            ("skatteetaten_uttalelse", "Uttalelse innhentet fra Skatteetaten"),
            ("nav_uttalelse", "Uttalelse innhentet fra NAV (sosialtjenesten)"),
            ("vandel_bevillingshaver", "Vandel OK – bevillingshaver/eier"),
            ("vandel_styrer", "Vandel OK – styrer (kun alkohollovgivning)"),
            ("vandel_stedfortreder", "Vandel OK – stedfortreder (kun alkohollovgivning)"),
            ("vandel_vesentlig_innflytelse", "Vandel OK – personer med vesentlig innflytelse"));

        WriteSection(writer, "personkrav", "Krav til styrer og stedfortreder",
            ("styrer_alder", "Styrer er over 20 år"),
            ("stedfortreder_alder", "Stedfortreder er over 20 år"),
            ("styrer_ansatt", "Styrer er ansatt på stedet / eier"),
            ("stedfortreder_ansatt", "Stedfortreder er ansatt på stedet / eier"),
            ("styrer_kun_ett_sted", "Styrer er ikke styrer/stedfortreder på annet sted"),
            ("stedfortreder_kun_ett_sted", "Stedfortreder er ikke styrer/stedfortreder på annet sted"),
            ("fritak_stedfortreder", "Fritak fra krav om stedfortreder vurdert"));

        WriteSection(writer, "lokalpolitisk", "Lokalpolitisk vurdering (kommunens retningslinjer)",
            ("beliggenhet_ok", "Beliggenhet i tråd med retningslinjer"),
            ("ikke_barn_unge_omraade", "Ikke i område for barn/unges fritidsaktiviteter"),
            ("ikke_idrettsarrangement", "Ikke idrettsarrangement eller arrangement for barn/unge"),
            ("brennevin_spisested", "Brennevin kun til spisested (hvis gr. 3)"),
            ("skjenketider_ok", "Skjenketider innenfor kommunens rammer"),
            ("arrangement_varighet_ok", "Arrangement innenfor maks 14 dager"));

        WriteSection(writer, "habilitet", "Habilitet og saksbehandling",
            ("habilitet_vurdert", "Habilitet vurdert (fvl. § 6)"),
            ("veiledningsplikt", "Veiledningsplikt overholdt (fvl. § 11)"),
            ("saksbehandlingstid", "Innenfor 90 dagers saksbehandlingsfrist"));

        WriteSection(writer, "gebyr", "Gebyr",
            ("gebyr_beregnet", "Bevillingsgebyr korrekt beregnet"));

        WriteSection(writer, "helhetsvurdering", "Helhetsvurdering",
            ("samlet_vurdering", "Samlet vurdering av søknaden"),
            ("anbefaling", "Foreløpig anbefaling"));

        writer.WriteEndObject();
    }

    private static void WriteSection(
        Utf8JsonWriter writer,
        string sectionId,
        string label,
        params (string id, string label)[] items)
    {
        writer.WriteStartObject(sectionId);
        writer.WriteString("label", label);

        writer.WriteStartObject("punkter");
        foreach (var (itemId, itemLabel) in items)
        {
            writer.WriteStartObject(itemId);
            writer.WriteString("label", itemLabel);
            writer.WriteString("status", DefaultStatus);
            writer.WriteString("merknad", "");
            writer.WriteEndObject();
        }
        writer.WriteEndObject();

        writer.WriteEndObject();
    }

    private static string GetKommune(JsonElement flatData)
    {
        // Try Kommunenummer first (most reliable)
        var kommunenummer = GetString(flatData, "Kommunenummer");
        if (kommunenummer != null && KommuneMap.TryGetValue(kommunenummer, out var mappedKommune))
            return mappedKommune;

        if (TryGet(flatData, "Arrangement", out var arrangement) &&
            TryGet(arrangement, "Arrangementssted", out var sted))
        {
            var kommune = GetString(sted, "Kommune");
            if (kommune != null)
                return kommune;

            if (TryGet(sted, "StedsAdresse", out var stedsAdr))
            {
                var knr = GetString(stedsAdr, "Kommunenummer");
                if (knr != null && KommuneMap.TryGetValue(knr, out var mapped))
                    return mapped;
            }
        }

        if (TryGet(flatData, "StedsOpplysninger", out var stedsOpplysninger))
        {
            var kommune = GetString(stedsOpplysninger, "Kommune");
            if (kommune != null)
                return kommune;
        }

        if (TryGet(flatData, "Innsender", out var innsender) &&
            TryGet(innsender, "Adresse", out var adr))
        {
            var knr = GetString(adr, "Kommunenummer");
            if (knr != null && KommuneMap.TryGetValue(knr, out var mapped))
                return mapped;
        }

        return "–";
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
