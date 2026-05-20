using System.Text.Json;
using Altinn.Augmenter.Agent.Pipelines.Generic;
using Altinn.Augmenter.Agent.Services.Registries;

namespace Altinn.Augmenter.Agent.Pipelines.RequestInfo;

public sealed class RequestInfoDataMapper(
    RegistryProvider registries,
    ILogger<RequestInfoDataMapper> logger) : IDataMapper
{
    private const string BevillingstyperRegistryFile = "bevillingstyper.json";

    public JsonDocument Map(JsonElement flatData)
    {
        using var stream = new MemoryStream();
        using var writer = new Utf8JsonWriter(stream);

        writer.WriteStartObject();

        WriteTypeSak(writer, flatData);
        WriteSted(writer, flatData);
        WriteArrangementsdato(writer, flatData);
        WritePersoner(writer, flatData);
        WriteLovhenvisninger(writer);
        WriteVedlegg(writer, flatData);

        writer.WriteEndObject();
        writer.Flush();

        stream.Position = 0;
        return JsonDocument.Parse(stream);
    }

    private void WriteTypeSak(Utf8JsonWriter writer, JsonElement flatData)
    {
        var bevillingsType = GetStringProperty(flatData, "BevillingsType");
        var bevillingstyper = registries.Load<MappingRegistry>(BevillingstyperRegistryFile);
        var typeSak = bevillingstyper.Map(bevillingsType);

        if (bevillingsType != null && !bevillingstyper.Mapping.ContainsKey(bevillingsType))
            logger.LogWarning("Unknown BevillingsType '{BevillingsType}', defaulting to {Default}", bevillingsType, typeSak);

        writer.WriteString("type-sak", typeSak);
    }

    private static void WriteSted(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartObject("sted");

        string? navn = null;
        string? adresse = null;

        if (TryGetProperty(flatData, "Arrangement", out var arrangement) &&
            TryGetProperty(arrangement, "Arrangementssted", out var arrangementssted))
        {
            navn = GetStringProperty(arrangementssted, "StedsNavn");
            if (TryGetProperty(arrangementssted, "StedsAdresse", out var stedsAdresse))
            {
                adresse = GetStringProperty(stedsAdresse, "Gateadresse");
            }
        }

        if (navn == null && TryGetProperty(flatData, "StedsOpplysninger", out var stedsOpplysninger))
        {
            navn = GetStringProperty(stedsOpplysninger, "Navn");
            adresse ??= GetStringProperty(stedsOpplysninger, "Adresse");
        }

        writer.WriteString("navn", navn ?? "Ukjent sted");
        writer.WriteString("adresse", adresse ?? "Ukjent adresse");
        writer.WriteEndObject();
    }

    private static void WriteArrangementsdato(Utf8JsonWriter writer, JsonElement flatData)
    {
        if (!TryGetProperty(flatData, "Arrangement", out var arrangement))
            return;

        if (!TryGetProperty(arrangement, "ArrangementPeriode", out var perioder))
            return;

        if (perioder.ValueKind != JsonValueKind.Array || perioder.GetArrayLength() == 0)
            return;

        var forstePeriode = perioder[0];
        var startDato = GetStringProperty(forstePeriode, "StartDato");
        if (startDato != null)
        {
            writer.WriteString("arrangementsdato", startDato);
        }
    }

    private static void WritePersoner(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartArray("personer");

        if (TryGetProperty(flatData, "Bevillingsansvarlig", out var ansvarlig))
        {
            WritePersonIfPresent(writer, ansvarlig, "Styrer", "Styrer");
            WritePersonIfPresent(writer, ansvarlig, "Stedfortreder", "Stedfortreder");
            WritePersonIfPresent(writer, ansvarlig, "DagligLeder", "Daglig leder ved stedet");
        }

        if (TryGetProperty(flatData, "Innsender", out var innsender))
        {
            var innsenderNavn = GetStringProperty(innsender, "FulltNavn");
            var innsenderFnr = GetStringProperty(innsender, "Foedselsnummer");

            // Only add innsender if not already added as Styrer/Stedfortreder
            if (innsenderNavn != null && innsenderFnr != null)
            {
                var alreadyAdded = false;
                if (TryGetProperty(flatData, "Bevillingsansvarlig", out var ansvarlig2))
                {
                    alreadyAdded = IsPersonMatch(ansvarlig2, "Styrer", innsenderFnr) ||
                                   IsPersonMatch(ansvarlig2, "Stedfortreder", innsenderFnr);
                }

                if (!alreadyAdded)
                {
                    WritePerson(writer, "Innsender", innsenderNavn, innsenderFnr);
                }
            }
        }

        WritePersonerMedInnflytelse(writer, flatData);

        WriteOrganisasjonIfPresent(writer, flatData);

        writer.WriteEndArray();
    }

    private static void WritePersonIfPresent(Utf8JsonWriter writer, JsonElement parent, string propertyName, string rolle)
    {
        if (!TryGetProperty(parent, propertyName, out var person))
            return;

        var navn = GetStringProperty(person, "FulltNavn") ?? BuildFulltNavn(person);
        var id = GetStringProperty(person, "Foedselsnummer");

        if (navn != null && id != null)
        {
            WritePerson(writer, rolle, navn, id);
        }
    }

    private static void WritePersonerMedInnflytelse(Utf8JsonWriter writer, JsonElement flatData)
    {
        if (!TryGetProperty(flatData, "PersonerMedInnflytelse", out var pmi))
            return;

        if (TryGetProperty(pmi, "FysiskePersoner", out var fysiske) && fysiske.ValueKind == JsonValueKind.Array)
        {
            foreach (var person in fysiske.EnumerateArray())
            {
                var navn = GetStringProperty(person, "FulltNavn") ?? GetStringProperty(person, "Navn");
                var id = GetStringProperty(person, "Foedselsnummer") ?? GetStringProperty(person, "Id");
                var rolle = GetStringProperty(person, "Rolle") ?? "Person med vesentlig innflytelse";

                if (navn != null && id != null)
                {
                    WritePerson(writer, rolle, navn, id);
                }
            }
        }

        if (TryGetProperty(pmi, "JuridiskePersoner", out var juridiske) && juridiske.ValueKind == JsonValueKind.Array)
        {
            foreach (var org in juridiske.EnumerateArray())
            {
                var navn = GetStringProperty(org, "Navn");
                var id = GetStringProperty(org, "Organisasjonsnummer");
                var rolle = GetStringProperty(org, "Rolle") ?? "Juridisk person med vesentlig innflytelse";

                if (navn != null && id != null)
                {
                    WritePerson(writer, rolle, navn, id);
                }
            }
        }
    }

    private static void WriteOrganisasjonIfPresent(Utf8JsonWriter writer, JsonElement flatData)
    {
        if (!TryGetProperty(flatData, "OrganisasjonsInformasjon", out var orgInfo))
            return;

        var orgNavn = GetStringProperty(orgInfo, "Navn");
        var orgNr = GetStringProperty(orgInfo, "Organisasjonsnummer");

        if (orgNavn != null && orgNr != null)
        {
            WritePerson(writer, "Bevillingshaver", orgNavn, orgNr);
        }
    }

    private static void WritePerson(Utf8JsonWriter writer, string rolle, string navn, string id)
    {
        writer.WriteStartObject();
        writer.WriteString("rolle", rolle);
        writer.WriteString("navn", navn);
        writer.WriteString("id", id);
        writer.WriteEndObject();
    }

    private void WriteLovhenvisninger(Utf8JsonWriter writer)
    {
        var bevillingstyper = registries.Load<MappingRegistry>(BevillingstyperRegistryFile);
        writer.WriteStartArray("lovhenvisninger");
        foreach (var reference in bevillingstyper.References)
        {
            writer.WriteStringValue(reference);
        }
        writer.WriteEndArray();
    }

    private static void WriteVedlegg(Utf8JsonWriter writer, JsonElement flatData)
    {
        writer.WriteStartArray("vedlegg");

        if (TryGetProperty(flatData, "VedleggsListe", out var vedleggsListe) &&
            TryGetProperty(vedleggsListe, "Rader", out var rader) &&
            rader.ValueKind == JsonValueKind.Array)
        {
            foreach (var rad in rader.EnumerateArray())
            {
                var navn = GetStringProperty(rad, "Navn") ?? GetStringProperty(rad, "Filnavn");
                if (navn != null)
                {
                    writer.WriteStringValue(navn);
                }
            }
        }

        writer.WriteEndArray();
    }

    private static bool IsPersonMatch(JsonElement ansvarlig, string propertyName, string foedselsnummer)
    {
        if (!TryGetProperty(ansvarlig, propertyName, out var person))
            return false;

        return GetStringProperty(person, "Foedselsnummer") == foedselsnummer;
    }

    private static string? BuildFulltNavn(JsonElement person)
    {
        var fornavn = GetStringProperty(person, "Fornavn");
        var mellomnavn = GetStringProperty(person, "Mellomnavn");
        var etternavn = GetStringProperty(person, "Etternavn");

        if (fornavn == null && etternavn == null)
            return null;

        var parts = new[] { fornavn, mellomnavn, etternavn }
            .Where(p => !string.IsNullOrWhiteSpace(p));

        return string.Join(" ", parts);
    }

    private static string? GetStringProperty(JsonElement element, string propertyName)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return null;

        if (!element.TryGetProperty(propertyName, out var prop))
            return null;

        return prop.ValueKind == JsonValueKind.String ? prop.GetString() : null;
    }

    private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement value)
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
