using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Converters;

public class PagesJsonConverter : JsonConverter<Pages>
{
    public override Pages Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        using JsonDocument jsonDoc = JsonDocument.ParseValue(ref reader);
        JsonElement root = jsonDoc.RootElement;
        string json = root.GetRawText();

        if (root.TryGetProperty("order", out _))
        {
            return JsonSerializer.Deserialize<PagesWithOrder>(json, options);
        }
        else if (root.TryGetProperty("groups", out _))
        {
            return JsonSerializer.Deserialize<PagesWithGroups>(json, options);
        }

        throw new JsonException("Cannot determine pages configuration for serialization");
    }

    public override void Write(Utf8JsonWriter writer, Pages pages, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, pages!, pages.GetType(), options);
    }
}
