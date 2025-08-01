using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Models;

public class LocalizedStringConverter : JsonConverter<LocalizedString>
{
    public override LocalizedString Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var value = reader.GetString() ?? "";
            return new LocalizedString { Nb = value, Nn = "", En = "" };
        }

        if (reader.TokenType == JsonTokenType.StartObject)
        {
            using var doc = JsonDocument.ParseValue(ref reader);
            var root = doc.RootElement;
            return new LocalizedString
            {
                Nb = root.TryGetProperty("nb", out var nb) ? nb.GetString() ?? "" : "",
                Nn = root.TryGetProperty("nn", out var nn) ? nn.GetString() ?? "" : "",
                En = root.TryGetProperty("en", out var en) ? en.GetString() ?? "" : ""
            };
        }

        throw new JsonException("Ugyldig format for LocalizedString.");
    }

    public override void Write(Utf8JsonWriter writer, LocalizedString value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        writer.WriteString("nb", value.Nb ?? "");
        writer.WriteString("nn", value.Nn ?? "");
        writer.WriteString("en", value.En ?? "");
        writer.WriteEndObject();
    }
}
