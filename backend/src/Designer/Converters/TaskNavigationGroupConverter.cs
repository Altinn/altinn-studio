using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Converters;

public class TaskNavigationGroupConverter : JsonConverter<TaskNavigationGroup>
{
    public override TaskNavigationGroup Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var jsonDoc = JsonDocument.ParseValue(ref reader);
        var root = jsonDoc.RootElement;
        var json = root.GetRawText();

        if (root.TryGetProperty("taskId", out JsonElement taskIdProp) && taskIdProp.GetString() is not null)
        {
            return JsonSerializer.Deserialize<TaskNavigationTask>(json, options);
        }

        if (root.TryGetProperty("type", out JsonElement typeProp) && typeProp.GetString()?.ToLowerInvariant() == "receipt")
        {
            return JsonSerializer.Deserialize<TaskNavigationReceipt>(json, options);
        }

        return JsonSerializer.Deserialize<TaskNavigationGroup>(json, options);
    }

    public override void Write(Utf8JsonWriter writer, TaskNavigationGroup value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, (object)value!, value.GetType(), options);
    }
}
