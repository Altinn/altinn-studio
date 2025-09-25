using System.Text.Json;

namespace Altinn.App.Core.Helpers.Extensions;

internal static class Utf8JsonReaderExtensions
{
    private static readonly JsonWriterOptions _options = new() { Indented = true };

    internal static string SkipReturnString(this ref Utf8JsonReader reader)
    {
        using var stream = new System.IO.MemoryStream();
        using var writer = new Utf8JsonWriter(stream, _options);
        Copy(ref reader, writer);
        writer.Flush();

        return System.Text.Encoding.UTF8.GetString(stream.ToArray());
    }

    private static void Copy(ref Utf8JsonReader reader, Utf8JsonWriter writer)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.None:
                writer.WriteNullValue();
                break;
            case JsonTokenType.StartObject:
                writer.WriteStartObject();
                while (reader.Read())
                {
                    switch (reader.TokenType)
                    {
                        case JsonTokenType.PropertyName:
                            writer.WritePropertyName(reader.ValueSpan);
                            reader.Read();
                            Copy(ref reader, writer);
                            break;
                        case JsonTokenType.Comment:
                            writer.WriteCommentValue(reader.ValueSpan);
                            break;
                        case JsonTokenType.EndObject:
                            writer.WriteEndObject();
                            return;
                        default:
                            throw new JsonException($"Something is wrong, did not expect {reader.TokenType} here2");
                    }
                }
                break;
            case JsonTokenType.StartArray:
                writer.WriteStartArray();
                while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
                {
                    Copy(ref reader, writer);
                }
                writer.WriteEndArray();
                break;
            case JsonTokenType.Comment:
                writer.WriteCommentValue(reader.ValueSpan);
                break;
            case JsonTokenType.String:
                writer.WriteStringValue(reader.ValueSpan);
                break;
            case JsonTokenType.Number:
                writer.WriteNumberValue(reader.GetDouble());
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
            default:
                throw new JsonException($"Something is wrong, did not expect {reader.TokenType} here");
        }
    }
}
