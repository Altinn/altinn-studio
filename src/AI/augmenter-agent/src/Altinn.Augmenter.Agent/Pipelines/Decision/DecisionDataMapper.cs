using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Decision;

public sealed class DecisionDataMapper : IDecisionDataMapper
{
    private static readonly Dictionary<string, string> KommuneMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["4204"] = "Kristiansand",
        ["4223"] = "Vennesla",
    };

    public JsonDocument MapToDecision(JsonElement flatData)
    {
        using var stream = new MemoryStream();
        using var writer = new Utf8JsonWriter(stream);

        writer.WriteStartObject();

        WriteMeta(writer, flatData);
        WriteSoker(writer, flatData);
        WriteSted(writer, flatData);
        WriteVedtak(writer, flatData);
        WriteArrangement(writer, flatData);
        WriteStyrer(writer, flatData);
        WriteStedfortreder(writer, flatData);
        WriteKlage(writer, flatData);
        WriteVedlegg(writer);

        writer.WriteEndObject();
        writer.Flush();

        stream.Position = 0;
        return JsonDocument.Parse(stream);
    }

    private static void WriteMeta(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("meta");
        writer.WriteString("saksnummer", "–");
        writer.WriteString("vedtaksdato", DateTime.UtcNow.ToString("dd.MM.yyyy"));
        writer.WriteString("soknadsdato", "–");
        writer.WriteString("kommune", GetKommune(flatData));
        writer.WriteString("saksbehandler", "AI-agent");
        writer.WriteEndObject();
    }

    private static void WriteSoker(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("soker");

        var firmanavn = (string?)null;
        var orgNr = (string?)null;

        if (TryGet(flatData, "OrganisasjonsInformasjon", out var orgInfo))
        {
            firmanavn = GetString(orgInfo, "Navn");
            orgNr = GetString(orgInfo, "Organisasjonsnummer");
        }

        var brukerType = GetString(flatData, "BrukerType");
        var isPrivatperson = string.Equals(brukerType, "person", StringComparison.OrdinalIgnoreCase)
                             || string.IsNullOrEmpty(firmanavn);

        if (isPrivatperson)
        {
            // Use the submitter's name as the applicant when there's no org
            var innsenderNavn = GetInnsenderNavn(flatData);
            writer.WriteString("firmanavn", innsenderNavn != "–" ? innsenderNavn : "Privatperson");
            writer.WriteString("kontaktperson", innsenderNavn);
        }
        else
        {
            writer.WriteString("firmanavn", firmanavn);
            writer.WriteString("kontaktperson", GetInnsenderNavn(flatData));
        }

        // Only include org.nr if it's actually present and valid
        if (!string.IsNullOrEmpty(orgNr))
        {
            writer.WriteString("organisasjonsnummer", orgNr);
        }

        // Try to get address from submitter
        var adresse = "–";
        if (TryGet(flatData, "Innsender", out var innsender) &&
            TryGet(innsender, "Adresse", out var adr))
        {
            adresse = GetString(adr, "Gateadresse") ?? adresse;
        }
        writer.WriteString("adresse", adresse);

        writer.WriteEndObject();
    }

    private static void WriteSted(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("sted");

        var stedsNavn = "Ukjent";
        var stedsAdresse = "–";

        if (TryGet(flatData, "Arrangement", out var arrangement) &&
            TryGet(arrangement, "Arrangementssted", out var sted))
        {
            stedsNavn = GetString(sted, "StedsNavn") ?? stedsNavn;
            if (TryGet(sted, "StedsAdresse", out var adr))
            {
                stedsAdresse = GetString(adr, "Gateadresse") ?? stedsAdresse;
            }
        }
        else if (TryGet(flatData, "StedsOpplysninger", out var stedsOpplysninger))
        {
            stedsNavn = GetString(stedsOpplysninger, "Navn") ?? stedsNavn;
            stedsAdresse = GetString(stedsOpplysninger, "Adresse") ?? stedsAdresse;
        }

        writer.WriteString("navn", stedsNavn);
        writer.WriteString("adresse", stedsAdresse);

        writer.WriteEndObject();
    }

    private static void WriteVedtak(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("vedtak");

        var bevillingsType = MapBevillingstype(GetString(flatData, "BevillingsType"));
        var alkoholgruppe = MapAlkoholgruppe(GetString(flatData, "Arrangement"));

        // Try to get alkoholgruppe from Arrangement.VaregruppeAlkohol
        if (TryGet(flatData, "Arrangement", out var arr))
        {
            var varegruppe = GetString(arr, "VaregruppeAlkohol");
            if (varegruppe != null)
                alkoholgruppe = MapVaregruppe(varegruppe);
        }

        writer.WriteString("utfall", "innvilgelse");
        writer.WriteString("bevillingstype", bevillingsType);
        writer.WriteString("alkoholgruppe", alkoholgruppe);

        // Set bevillingsperiode from arrangement dates if available
        var fraDato = DateTime.UtcNow.ToString("dd.MM.yyyy");
        var tilDato = "–";
        if (TryGet(flatData, "Arrangement", out var arrangement) &&
            TryGet(arrangement, "ArrangementPeriode", out var perioder) &&
            perioder.ValueKind == JsonValueKind.Array &&
            perioder.GetArrayLength() > 0)
        {
            var forstePeriode = perioder[0];
            fraDato = GetString(forstePeriode, "StartDato") ?? fraDato;
            tilDato = GetString(forstePeriode, "SluttDato") ?? tilDato;
        }

        writer.WriteStartObject("bevillingsperiode");
        writer.WriteString("fra_dato", fraDato);
        writer.WriteString("til_dato", tilDato);
        writer.WriteEndObject();

        writer.WriteEndObject();
    }

    private static void WriteArrangement(Utf8JsonWriter writer, JsonElement flatData)
    {
        if (!TryGet(flatData, "Arrangement", out var arrangement))
            return;

        writer.WriteStartObject("arrangement");

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
            tilDato = GetString(forstePeriode, "SluttDato") ?? tilDato;
            fraKlokkeslett = GetString(forstePeriode, "StartTid") ?? fraKlokkeslett;
            tilKlokkeslett = GetString(forstePeriode, "SluttTid") ?? tilKlokkeslett;
        }

        writer.WriteString("fra_dato", fraDato);
        writer.WriteString("fra_klokkeslett", fraKlokkeslett);
        writer.WriteString("til_dato", tilDato);
        writer.WriteString("til_klokkeslett", tilKlokkeslett);
        writer.WriteNumber("antall_deltakere", ParseInt(GetString(arrangement, "AntallDeltakere")));

        var typeDeltakere = GetString(arrangement, "TypeDeltakere");
        var aapen = !string.Equals(typeDeltakere, "bestemtePersoner", StringComparison.OrdinalIgnoreCase);
        writer.WriteBoolean("aapen", aapen);

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
        }
        else
        {
            writer.WriteString("navn", "Ikke oppgitt");
            writer.WriteString("fodselsnummer", "–");
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
            {
                fritakSokt = true;
            }

            if (TryGet(ansvarlig, "Stedfortreder", out var stedfortreder))
            {
                writer.WriteString("navn", BuildFulltNavn(stedfortreder));
                writer.WriteString("fodselsnummer", GetString(stedfortreder, "Foedselsnummer") ?? "–");
                writer.WriteBoolean("fritak", fritakSokt);
            }
            else
            {
                writer.WriteString("navn", "Ikke oppgitt");
                writer.WriteString("fodselsnummer", "–");
                writer.WriteBoolean("fritak", fritakSokt);
            }
        }
        else
        {
            writer.WriteString("navn", "Ikke oppgitt");
            writer.WriteString("fodselsnummer", "–");
            writer.WriteBoolean("fritak", false);
        }

        writer.WriteEndObject();
    }

    private static void WriteKlage(Utf8JsonWriter writer, JsonElement flatData)
    {
        var kommune = GetKommune(flatData);
        var kommuneEpost = kommune.Equals("Kristiansand", StringComparison.OrdinalIgnoreCase)
            ? "post@kristiansand.kommune.no"
            : "post@vennesla.kommune.no";

        writer.WriteStartObject("klage");
        writer.WriteNumber("klagefrist_uker", 3);
        writer.WriteString("klageinstans", "Statsforvalteren i Agder");
        writer.WriteString("kommune_epost", kommuneEpost);
        writer.WriteEndObject();
    }

    private static void WriteVedlegg(Utf8JsonWriter writer)
    {
        writer.WriteStartArray("vedlegg");
        writer.WriteEndArray();
    }

    private static string MapBevillingstype(string? bevillingsType)
    {
        if (string.IsNullOrEmpty(bevillingsType))
            return "enkeltbevilling";

        var normalized = bevillingsType.ToLowerInvariant().Replace(" ", "").Replace("-", "");

        if (normalized.Contains("enkelt") || normalized.Contains("arrangement"))
            return "enkeltbevilling";
        if (normalized.Contains("utvidelse") && normalized.Contains("skjenke"))
            return "utvidelse_skjenke";
        if (normalized.Contains("skjenke"))
            return "skjenkebevilling";
        if (normalized.Contains("salg"))
            return "salgsbevilling";
        if (normalized.Contains("servering"))
            return "serveringsbevilling";

        return "enkeltbevilling";
    }

    private static string MapVaregruppe(string varegruppe)
    {
        var normalized = varegruppe.ToLowerInvariant().Replace(" ", "").Replace("-", "");

        if (normalized.Contains("tre") || normalized.Contains("3"))
            return "gruppe_1_2_3";
        if (normalized.Contains("to") || normalized.Contains("2"))
            return "gruppe_1_2";

        return "gruppe_1";
    }

    private static string MapAlkoholgruppe(string? _) => "gruppe_1_2";

    private static string GetKommune(JsonElement flatData)
    {
        // Try Kommunenummer first (most reliable)
        var kommunenummer = GetString(flatData, "Kommunenummer");
        if (kommunenummer != null && KommuneMap.TryGetValue(kommunenummer, out var mappedKommune))
            return mappedKommune;

        // Try nested Kommune fields
        if (TryGet(flatData, "Arrangement", out var arrangement) &&
            TryGet(arrangement, "Arrangementssted", out var sted))
        {
            var kommune = GetString(sted, "Kommune");
            if (kommune != null)
                return kommune;

            // Try Kommunenummer in address
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

        // Try Innsender address
        if (TryGet(flatData, "Innsender", out var innsender) &&
            TryGet(innsender, "Adresse", out var adr))
        {
            var knr = GetString(adr, "Kommunenummer");
            if (knr != null && KommuneMap.TryGetValue(knr, out var mapped))
                return mapped;
        }

        return "Vennesla";
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

    private static int ParseInt(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return 0;
        return int.TryParse(value, out var result) ? result : 0;
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
