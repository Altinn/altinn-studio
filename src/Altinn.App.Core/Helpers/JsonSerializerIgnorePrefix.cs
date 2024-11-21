using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

namespace Altinn.App.Core.Helpers;

internal static class JsonSerializerIgnorePrefix
{
    private static readonly Dictionary<string, JsonSerializerOptions> _ignorePrefixOptions = new();

    internal static JsonSerializerOptions GetOptions(string prefix)
    {
        lock (_ignorePrefixOptions)
        {
            if (_ignorePrefixOptions.TryGetValue(prefix, out var options))
            {
                return options;
            }

            var modifier = (JsonTypeInfo ti) =>
            {
                if (ti.Kind != JsonTypeInfoKind.Object)
                    return;

                ti.Properties.RemoveAll(prop => prop.Name.StartsWith(prefix, StringComparison.Ordinal));
            };

            JsonSerializerOptions newOptions = new()
            {
                TypeInfoResolver = new DefaultJsonTypeInfoResolver { Modifiers = { modifier } },
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            };
            _ignorePrefixOptions.Add(prefix, newOptions);
            return newOptions;
        }
    }

    internal static string Serialize(object obj, string prefix)
    {
        ArgumentNullException.ThrowIfNull(prefix);

        var options = GetOptions(prefix);
        return JsonSerializer.Serialize(obj, options);
    }
}
