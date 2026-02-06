using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Converters;

public class NextStepTypeJsonConverter : JsonConverter<NextStepType>
{
    // Map all accepted strings (lowercase) to enum values
    private static readonly Dictionary<string, NextStepType> s_stringToEnum = new(StringComparer.OrdinalIgnoreCase)
    {
        { "configuration", NextStepType.Configuration },
        { "konfigurasjon", NextStepType.Configuration },

        { "code-change", NextStepType.CodeChange },
        { "codeChange", NextStepType.CodeChange },
        { "kodeEndring", NextStepType.CodeChange },
        { "kode-endring", NextStepType.CodeChange },

        { "documentation", NextStepType.Documentation },
        { "dokumentasjon", NextStepType.Documentation }
    };

    // Map enum values to preferred string (English)
    private static readonly Dictionary<NextStepType, string> s_enumToString = new()
    {
        { NextStepType.Configuration, "Configuration" },
        { NextStepType.CodeChange, "CodeChange" },
        { NextStepType.Documentation, "Documentation" }
    };

    public override NextStepType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new JsonException("Value for NextStepType is null or empty.");
        }

        var normalized = value.Trim().ToLowerInvariant().Replace("-", "");

        if (s_stringToEnum.TryGetValue(normalized, out var result))
        {
            return result;
        }

        throw new JsonException($"Unknown NextStepType value: {value}");
    }

    public override void Write(Utf8JsonWriter writer, NextStepType value, JsonSerializerOptions options)
    {
        if (s_enumToString.TryGetValue(value, out var stringValue))
        {
            writer.WriteStringValue(stringValue);
        }
        else
        {
            writer.WriteStringValue(value.ToString());
        }
    }
}
