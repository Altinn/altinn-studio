using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services;

public sealed class DecisionDataMapper : IDecisionDataMapper
{
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

        var firmanavn = "Ukjent";
        var orgNr = "000000000";

        if (TryGet(flatData, "OrganisasjonsInformasjon", out var orgInfo))
        {
            firmanavn = GetString(orgInfo, "Navn") ?? firmanavn;
            orgNr = GetString(orgInfo, "Organisasjonsnummer") ?? orgNr;
        }

        writer.WriteString("firmanavn", firmanavn);
        writer.WriteString("organisasjonsnummer", orgNr);
        writer.WriteString("kontaktperson", GetInnsenderNavn(flatData));
        writer.WriteString("adresse", "–");

        writer.WriteEndObject();
    }

    private static void WriteSted(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("sted");

        var stedsNavn = "Ukjent";
        var stedsAdresse = "–";
        var kapasitet = 0;

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
        writer.WriteNumber("personkapasitet_inne", kapasitet);

        writer.WriteEndObject();
    }

    private static void WriteVedtak(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("vedtak");

        var bevillingsType = MapBevillingstype(GetString(flatData, "BevillingsType"));

        writer.WriteString("utfall", "innvilgelse");
        writer.WriteString("bevillingstype", bevillingsType);
        writer.WriteString("alkoholgruppe", "gruppe_1_2");

        writer.WriteStartObject("bevillingsperiode");
        writer.WriteString("fra_dato", DateTime.UtcNow.ToString("dd.MM.yyyy"));
        writer.WriteString("til_dato", "–");
        writer.WriteEndObject();

        writer.WriteEndObject();
    }

    private static void WriteArrangement(Utf8JsonWriter writer, JsonElement flatData)
    {
        if (!TryGet(flatData, "Arrangement", out var arrangement))
            return;

        writer.WriteStartObject("arrangement");

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
            tilDato = GetString(forstePeriode, "SluttDato") ?? tilDato;
        }

        writer.WriteString("fra_dato", fraDato);
        writer.WriteString("fra_klokkeslett", "–");
        writer.WriteString("til_dato", tilDato);
        writer.WriteString("til_klokkeslett", "–");
        writer.WriteNumber("antall_deltakere", 0);
        writer.WriteBoolean("aapen", false);

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

        if (TryGet(flatData, "Bevillingsansvarlig", out var ansvarlig) &&
            TryGet(ansvarlig, "Stedfortreder", out var stedfortreder))
        {
            writer.WriteString("navn", BuildFulltNavn(stedfortreder));
            writer.WriteString("fodselsnummer", GetString(stedfortreder, "Foedselsnummer") ?? "–");
            writer.WriteBoolean("fritak", false);
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

        if (normalized.Contains("enkelt"))
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

        return "Vennesla";
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
