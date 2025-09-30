using System.Text;
using System.Text.Json;

namespace Altinn.App.Api.Tests.Utils;

public static class JsonUtils
{
    public static string IndentJson(string json)
    {
        try
        {
            var bytes = Encoding.UTF8.GetBytes(json);
            var parser = new Utf8JsonReader(bytes);
            using var outStream = new MemoryStream(bytes.Length * 2);
            using var writer = new Utf8JsonWriter((outStream), new JsonWriterOptions { Indented = true });

            while (parser.Read())
            {
                switch (parser.TokenType)
                {
                    case JsonTokenType.StartObject:
                        writer.WriteStartObject();
                        break;
                    case JsonTokenType.EndObject:
                        writer.WriteEndObject();
                        break;
                    case JsonTokenType.StartArray:
                        writer.WriteStartArray();
                        break;
                    case JsonTokenType.EndArray:
                        writer.WriteEndArray();
                        break;
                    case JsonTokenType.PropertyName:
                        writer.WritePropertyName(parser.GetString()!);
                        break;
                    case JsonTokenType.String:
                        writer.WriteStringValue(parser.GetString());
                        break;
                    case JsonTokenType.Number:
                        if (parser.TryGetInt64(out long longValue))
                        {
                            writer.WriteNumberValue(longValue);
                        }
                        else if (parser.TryGetDouble(out double doubleValue))
                        {
                            writer.WriteNumberValue(doubleValue);
                        }
                        break;
                    case JsonTokenType.True:
                        writer.WriteBooleanValue(true);
                        break;
                    case JsonTokenType.False:
                        writer.WriteBooleanValue(false);
                        break;
                    case JsonTokenType.Null:
                        writer.WriteNullValue();
                        break;
                }
            }

            writer.Flush();
            outStream.Position = 0;

            return Encoding.UTF8.GetString(outStream.ToArray());
        }
        catch (JsonException)
        {
            return json;
        }
    }
}
