using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Checklist;

public sealed class ChecklistDataMapper : IChecklistDataMapper
{
    private const string DefaultStatus = "ikke_vurdert";

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

        var orgNavn = "Ukjent";
        var orgNr = "–";

        if (TryGet(flatData, "OrganisasjonsInformasjon", out var orgInfo))
        {
            orgNavn = GetString(orgInfo, "Navn") ?? orgNavn;
            orgNr = GetString(orgInfo, "Organisasjonsnummer") ?? orgNr;
        }

        writer.WriteString("navn", orgNavn);
        writer.WriteString("organisasjonsnummer", orgNr);
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
        writer.WriteString("type", GetString(arrangement, "Type") ?? "–");

        var fraDato = "–";
        var tilDato = "–";
        if (TryGet(arrangement, "ArrangementPeriode", out var perioder) &&
            perioder.ValueKind == JsonValueKind.Array &&
            perioder.GetArrayLength() > 0)
        {
            var forstePeriode = perioder[0];
            fraDato = GetString(forstePeriode, "StartDato") ?? fraDato;
            tilDato = GetString(forstePeriode, "SluttDato") ?? fraDato;
        }

        writer.WriteString("fra_dato", fraDato);
        writer.WriteString("fra_klokkeslett", "–");
        writer.WriteString("til_dato", tilDato);
        writer.WriteString("til_klokkeslett", "–");
        writer.WriteNumber("antall_deltakere", 0);
        writer.WriteString("aapen_eller_lukket", "–");
        writer.WriteString("innendors_utendors", "–");
        writer.WriteString("lokale_navn", stedsNavn);
        writer.WriteString("lokale_adresse", stedsAdresse);

        writer.WriteEndObject();
    }

    private static void WriteBevilling(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("bevilling");

        var bevillingsType = GetString(flatData, "BevillingsType") ?? "ukjent";
        writer.WriteString("type_bevilling", bevillingsType);
        writer.WriteString("alkoholgruppe", "–");
        writer.WriteBoolean("har_eksisterende_bevilling", false);

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
            writer.WriteString("epost", "–");
            writer.WriteString("telefon", "–");
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

        if (TryGet(flatData, "Bevillingsansvarlig", out var ansvarlig) &&
            TryGet(ansvarlig, "Stedfortreder", out var stedfortreder))
        {
            writer.WriteString("navn", BuildFulltNavn(stedfortreder));
            writer.WriteString("fodselsnummer", GetString(stedfortreder, "Foedselsnummer") ?? "–");
            writer.WriteString("epost", "–");
            writer.WriteString("telefon", "–");
            writer.WriteBoolean("fritak_sokt", false);
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
        if (TryGet(flatData, "Arrangement", out var arrangement) &&
            TryGet(arrangement, "Arrangementssted", out var sted))
        {
            var kommune = GetString(sted, "Kommune");
            if (kommune != null)
                return kommune;
        }

        if (TryGet(flatData, "StedsOpplysninger", out var stedsOpplysninger))
        {
            var kommune = GetString(stedsOpplysninger, "Kommune");
            if (kommune != null)
                return kommune;
        }

        return "–";
    }

    private static string GetInnsenderNavn(JsonElement flatData)
    {
        if (TryGet(flatData, "Innsender", out var innsender))
        {
            return GetString(innsender, "FulltNavn") ?? "–";
        }
        return "–";
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
