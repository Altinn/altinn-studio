using System.Diagnostics;
using System.Text;

namespace NanoJsonReader;

public enum JsonType
{
    Error,
    Null,
    Boolean,
    String,
    Number,
    Object,
    Array,
}

public class NanoJsonException : Exception
{
    public int StartIndex { get; }
    public int? EndIndex { get; }

    public string FullJson { get; }

    public NanoJsonException(string message, string fullJson, int startIndex, int? endIndex)
        : base(FormatMessage(message, fullJson, startIndex, endIndex))
    {
        StartIndex = startIndex;
        EndIndex = endIndex;
        FullJson = fullJson;
    }

    private static string FormatMessage(string message, string fullJson, int startIndex, int? endIndex)
    {
        var sb = new StringBuilder();
        sb.Append(message);
        sb.Append(" at index ");
        sb.Append(startIndex);
        if (endIndex.HasValue)
        {
            sb.Append(" to ");
            sb.Append(endIndex.Value);
        }

        sb.AppendLine();

        var firstVisibleIndex = Math.Max(0, startIndex - 20);
        var displayLength = Math.Min(80, fullJson.Length - firstVisibleIndex);
        var snippet = GetMonospaceString(fullJson.Substring(firstVisibleIndex, displayLength));
        sb.AppendLine(snippet);
        sb.Append(new string(' ', startIndex - firstVisibleIndex) + "^");
        if (endIndex.HasValue)
        {
            sb.Append(new string('~', endIndex.Value - startIndex));
        }

        sb.AppendLine();

        return sb.ToString();
    }

    private static string GetMonospaceString(string input)
    {
        var sb = new StringBuilder(input.Length);
        foreach (char c in input)
        {
            // Display newlines as ␤ and carriage returns as ␍
            if (c == '\n')
                sb.Append('\u2424'); // ␤
            else if (c == '\r')
                sb.Append('\u240D'); // ␍
            else if (char.IsLetterOrDigit(c) || char.IsPunctuation(c) || char.IsSymbol(c))
                // Accept letters, digits, punctuation and symbols as is
                sb.Append(c);
            else if (char.IsWhiteSpace(c))
                // Replace whitespace with space
                sb.Append(' ');
            else
                // Replace other characters with unicode replacement character �
                sb.Append('\uFFFD');
        }
        return sb.ToString();
    }
}

public class JsonValue
{
    public readonly string FullJson;
    public readonly JsonType Type;
    public readonly int Start;

    private int? _end;

    public int End
    {
        get
        {
            if (_end.HasValue)
            {
                return _end.Value;
            }

            switch (Type)
            {
                case JsonType.Array:
                    foreach (var _ in GetArrayValues())
                    {
                        // Iterate through all array values to find the end
                    }
                    return _end ?? throw new InvalidOperationException("End was not set after reading array");
                case JsonType.Object:
                    foreach (var _ in GetObjectValues())
                    {
                        // Iterate through all object values to find the end
                    }
                    return _end ?? throw new InvalidOperationException("End was not set after reading object");
                default:
                    // End should be set at parse time for other types
                    throw new NotImplementedException();
            }
        }
    }

    public ReadOnlySpan<char> InnerJson => _end.HasValue ? FullJson.AsSpan().Slice(Start, _end.Value - Start) : default;

    public JsonValue(JsonType type, string fullJson, int start, int? end)
    {
        if (type is not (JsonType.Array or JsonType.Object))
        {
            Debug.Assert(end is not null);
        }
        Type = type;
        FullJson = fullJson;
        Start = start;
        _end = end;
    }

    public static JsonValue Parse(string json)
    {
        return JsonReader.ReadNextValue(json, 0);
    }

    public override string ToString() => InnerJson.ToString();

    public string GetString()
    {
        var stringSpan = GetStringSpan();
        Span<char> buffer =
            InnerJson.Length < 1000 ? stackalloc char[stringSpan.Length] : new char[stringSpan.Length].AsSpan();
        if (JsonReader.WriteStringToBuffer(stringSpan, buffer, out int charsWritten))
        {
            return buffer.Slice(0, charsWritten).ToString();
        }

        throw new NanoJsonException("Invalid string", FullJson, Start, End);
    }

    public ReadOnlySpan<char> GetStringSpan()
    {
        Debug.Assert(Type == JsonType.String);
        Debug.Assert(InnerJson[0] == '"');
        Debug.Assert(InnerJson[InnerJson.Length - 1] == '"');
        return InnerJson.Slice(1, InnerJson.Length - 2); // remove surrounding quotes
    }

    public bool StringEquals(ReadOnlySpan<char> s)
    {
        return JsonReader.CompareStringWithBuffer(s, GetStringSpan());
    }

    public bool GetBool()
    {
        Debug.Assert(Type == JsonType.Boolean);
        // Verification of false done at parse time.
        return InnerJson[0] == 't';
    }

    public double GetNumber()
    {
        Debug.Assert(Type == JsonType.Number);
#if NET8_0_OR_GREATER
        if (double.TryParse(InnerJson, out var number))
#else
        // netStandard2.0 does not support TryParse for double with ReadOnlySpan<char>
        if (double.TryParse(InnerJson.ToString(), out var number))
#endif
        {
            return number;
        }
        throw new NanoJsonException($"Could not parse number {InnerJson.ToString()}", FullJson, Start, End);
    }

    public IEnumerable<JsonValue> GetArrayValues()
    {
        int currentPosition = Start;
        Debug.Assert(Type == JsonType.Array);
        Debug.Assert(FullJson[currentPosition] == '[');
        currentPosition = JsonReader.SkipWhitespace(FullJson, currentPosition + 1);
        if (FullJson[currentPosition] == ']')
        {
            _end = currentPosition + 1;
            yield break;
        }

        while (true)
        {
            var item = JsonReader.ReadNextValue(FullJson, currentPosition);
            yield return item;
            currentPosition = JsonReader.SkipWhitespace(FullJson, item.End);
            char sep = FullJson[currentPosition];
            if (sep == ',')
            {
                // Check for trailing comma
                currentPosition = JsonReader.SkipWhitespace(FullJson, currentPosition + 1);
                if (FullJson[currentPosition] == ']')
                {
                    _end = currentPosition + 1;
                    yield break;
                }
            }
            else if (sep == ']')
            {
                _end = currentPosition + 1;
                yield break;
            }
            else
            {
                throw new NanoJsonException("Expected comma or end of array", FullJson, currentPosition, null);
            }
        }
    }

    public IEnumerable<JsonProperty> GetObjectValues()
    {
        Debug.Assert(Type == JsonType.Object);
        int currentPosition = Start;
        Debug.Assert(FullJson[currentPosition] == '{');

        currentPosition = JsonReader.SkipWhitespace(FullJson, currentPosition + 1);
        if (FullJson[currentPosition] == '}')
        {
            _end = currentPosition + 1;
            yield break;
        }
        while (true)
        {
            var key = JsonReader.ReadNextValue(FullJson, currentPosition);
            if (key.Type != JsonType.String)
            {
                throw new NanoJsonException("Keys in json object must be string", FullJson, currentPosition, key.End);
            }
            currentPosition = JsonReader.SkipWhitespace(FullJson, key.End);

            if (FullJson[currentPosition] != ':')
            {
                throw new NanoJsonException("Expected colon after property name", FullJson, currentPosition, null);
            }

            var value = JsonReader.ReadNextValue(FullJson, currentPosition + 1);
            yield return new JsonProperty(key, value);
            currentPosition = JsonReader.SkipWhitespace(FullJson, value.End);
            char sep = FullJson[currentPosition];
            if (sep == ',')
            {
                // Check for trailing comma
                currentPosition = JsonReader.SkipWhitespace(FullJson, currentPosition + 1);
                if (FullJson[currentPosition] == '}')
                {
                    _end = currentPosition + 1;
                    yield break;
                }
            }
            else if (sep == '}')
            {
                _end = currentPosition + 1;
                yield break;
            }
            else
            {
                throw new NanoJsonException("Expected comma or end of object", FullJson, currentPosition, null);
            }
        }
    }

    public JsonValue? GetProperty(string propertyName) =>
        GetObjectValues().FirstOrDefault(item => item.IsPropertyName(propertyName.AsSpan()))?.Value;

    public class JsonProperty
    {
        private readonly JsonValue _key;

        public string Key => _key.GetString();
        public JsonValue Value { get; }

        public JsonProperty(JsonValue key, JsonValue value)
        {
            Debug.Assert(key.Type == JsonType.String);
            _key = key;
            Value = value;
        }

        public override string ToString() => _key.FullJson.Substring(_key.Start, Value.End - _key.Start);

        public bool IsPropertyName(ReadOnlySpan<char> propertyName) =>
            JsonReader.CompareStringWithBuffer(propertyName, _key.GetStringSpan());
    }
}

public static class JsonReader
{
    public static JsonValue ReadNextValue(string fullJson, int start)
    {
        int pos = SkipWhitespace(fullJson, start);

        return fullJson[pos] switch
        {
            '"' => ParseString(fullJson, pos),
            'n' => Match(fullJson, pos, "null", JsonType.Null),
            't' => Match(fullJson, pos, "true", JsonType.Boolean),
            'f' => Match(fullJson, pos, "false", JsonType.Boolean),
            '-' or >= '0' and <= '9' => ParseNumber(fullJson, pos),
            '{' => ReadObject(fullJson, pos),
            '[' => ReadArray(fullJson, pos),
            // End of array or object is handled by ReadObject and ReadArray, so a stray end is a syntax error.
            // ']' or '}' => new JsonValue(JsonType.Error, fullJson, start, pos),
            _ => throw new NanoJsonException($"Unexpected character '{fullJson[pos]}'", fullJson, pos, null),
        };
    }

    private static JsonValue ReadArray(string fullJson, int pos)
    {
        Debug.Assert(fullJson[pos] == '[');

        return new JsonValue(JsonType.Array, fullJson, pos, null);
    }

    private static JsonValue ReadObject(string fullJson, int pos)
    {
        Debug.Assert(fullJson[pos] == '{');

        return new JsonValue(JsonType.Object, fullJson, pos, null);
    }

    private static JsonValue Match(string fullJson, int index, string toMatch, JsonType type)
    {
        if (fullJson.AsSpan().Slice(index).StartsWith(toMatch.AsSpan(), StringComparison.Ordinal))
        {
            return new JsonValue(type, fullJson, index, index + toMatch.Length);
        }
        throw new NanoJsonException("Invalid json literal", fullJson, index, index + toMatch.Length);
    }

    private static JsonValue ParseString(string fullJson, int index)
    {
        int start = index;
        index++; // skip opening "
        while (fullJson[index] != '"')
        {
            // naive skip escape to ensure that we don't end the string at \"
            // (we use a better algorithm in WriteStringToBuffer that actually translate escape sequences to the proper characters)
            if (fullJson[index] == '\\')
                index++;
            index++;
            if (index >= fullJson.Length)
            {
                throw new NanoJsonException("Unterminated string", fullJson, start, index);
            }
        }
        return new JsonValue(JsonType.String, fullJson, start, index + 1);
    }

    private static JsonValue ParseNumber(string fullJson, int index)
    {
        var nextIndex = index;
        while (nextIndex < fullJson.Length && "-+.eE0123456789".Contains(fullJson[nextIndex]))
        {
            nextIndex++;
        }
        return new(JsonType.Number, fullJson, index, nextIndex);
    }

    public static int SkipWhitespace(string fullJson, int startPosition)
    {
        int currentPosition = startPosition;

        if (currentPosition >= fullJson.Length)
        {
            throw new NanoJsonException("End of json encountered", fullJson, startPosition, null);
        }

        while (char.IsWhiteSpace(fullJson, currentPosition))
        {
            currentPosition++;
            if (currentPosition >= fullJson.Length)
            {
                throw new NanoJsonException("End of json encountered", fullJson, startPosition, currentPosition);
            }
        }

        return currentPosition;
    }

    public static bool CompareStringWithBuffer(ReadOnlySpan<char> nonEscapedString, ReadOnlySpan<char> jsonBuffer)
    {
        // Fast path: if there are no escape characters, do a direct comparison
        int backslashIndex = jsonBuffer.IndexOf('\\');
        if (backslashIndex == -1)
            return jsonBuffer.SequenceEqual(nonEscapedString);

        // Slow path: handle escape sequences
        int jsonPos = 0;
        int rawPos = 0;

        while (jsonPos < jsonBuffer.Length && rawPos < nonEscapedString.Length)
        {
            char jsonChar = jsonBuffer[jsonPos];

            if (jsonChar == '\\')
            {
                if (jsonPos + 1 >= jsonBuffer.Length)
                    return false;

                jsonPos++;
                char escaped = jsonBuffer[jsonPos];
                char unescaped = escaped switch
                {
                    '"' or '\\' or '/' => escaped,
                    'b' => '\b',
                    'f' => '\f',
                    'n' => '\n',
                    'r' => '\r',
                    't' => '\t',
                    'u' => // Handle Unicode escape sequences
                    jsonPos + 4 < jsonBuffer.Length && TryParseHex16(jsonBuffer.Slice(jsonPos + 1, 4), out char code)
                        ? code
                        : '\0',
                    _ => '\0',
                };

                if (unescaped == '\0')
                    return false;

                if (unescaped != nonEscapedString[rawPos])
                    return false;

                jsonPos += escaped == 'u' ? 4 : 0;
            }
            else
            {
                if (jsonChar != nonEscapedString[rawPos])
                    return false;
            }

            jsonPos++;
            rawPos++;
        }

        return rawPos == nonEscapedString.Length && jsonPos == jsonBuffer.Length;
    }

    public static bool WriteStringToBuffer(ReadOnlySpan<char> jsonString, Span<char> buffer, out int writePos)
    {
        bool success = true;
        int readPos = 0;
        writePos = 0;

        while (readPos < jsonString.Length)
        {
            if (writePos >= buffer.Length)
                throw new ArgumentException("Buffer too small");

            char c = jsonString[readPos++];

            if (c == '\\')
            {
                if (readPos >= jsonString.Length)
                    return false;

                char esc = jsonString[readPos++];
                switch (esc)
                {
                    case '"':
                    case '\\':
                    case '/':
                        buffer[writePos++] = esc;
                        break;
                    case 'b':
                        buffer[writePos++] = '\b';
                        break;
                    case 'f':
                        buffer[writePos++] = '\f';
                        break;
                    case 'n':
                        buffer[writePos++] = '\n';
                        break;
                    case 'r':
                        buffer[writePos++] = '\r';
                        break;
                    case 't':
                        buffer[writePos++] = '\t';
                        break;
                    case 'u':
                        if (
                            readPos + 4 <= jsonString.Length
                            && TryParseHex16(jsonString.Slice(readPos, 4), out char code)
                        )
                        {
                            buffer[writePos++] = code;
                            readPos += 4;
                            break;
                        }

                        success = false;
                        break;
                    default:
                        success = false;
                        break;
                }
            }
            else
            {
                buffer[writePos++] = c;
            }
        }

        return success;
    }

    private static bool TryParseHex16(ReadOnlySpan<char> hex, out char value)
    {
        int val = 0;

        for (int i = 0; i < 4; i++)
        {
            char c = hex[i];
            int digit = c switch
            {
                >= '0' and <= '9' => c - '0',
                >= 'A' and <= 'F' => c - 'A' + 10,
                >= 'a' and <= 'f' => c - 'a' + 10,
                _ => -1,
            };

            if (digit < 0)
            {
                value = '\0';
                return false;
            }

            val += digit << ((3 - i) * 4);
        }

        value = (char)val;

        return true;
    }
}
