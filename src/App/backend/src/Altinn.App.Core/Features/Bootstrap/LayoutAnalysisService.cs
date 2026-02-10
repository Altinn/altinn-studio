using System.Text.Json;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Implementation of <see cref="ILayoutAnalysisService"/> that analyzes layout JSON
/// to extract referenced data types and static options.
/// </summary>
internal sealed class LayoutAnalysisService : ILayoutAnalysisService
{
    /// <inheritdoc />
    public HashSet<string> GetReferencedDataTypes(object layoutsJson, string defaultDataType)
    {
        var dataTypes = new HashSet<string> { defaultDataType };

        var json = ConvertToJsonElement(layoutsJson);
        TraverseForDataTypes(json, dataTypes);

        return dataTypes;
    }

    /// <inheritdoc />
    public Dictionary<string, List<Dictionary<string, string>>> GetStaticOptions(object layoutsJson)
    {
        var staticOptions = new Dictionary<string, List<Dictionary<string, string>>>();

        var json = ConvertToJsonElement(layoutsJson);
        TraverseForOptions(json, staticOptions);

        return staticOptions;
    }

    private static JsonElement ConvertToJsonElement(object layoutsJson)
    {
        if (layoutsJson is JsonElement element)
        {
            return element;
        }

        if (layoutsJson is string jsonString)
        {
            return JsonDocument.Parse(jsonString).RootElement;
        }

        // Fallback: serialize and re-parse
        var serialized = JsonSerializer.Serialize(layoutsJson);
        return JsonDocument.Parse(serialized).RootElement;
    }

    private static void TraverseForDataTypes(JsonElement element, HashSet<string> dataTypes)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                TraverseObjectForDataTypes(element, dataTypes);
                break;
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                {
                    TraverseForDataTypes(item, dataTypes);
                }
                break;
        }
    }

    private static void TraverseObjectForDataTypes(JsonElement obj, HashSet<string> dataTypes)
    {
        // Check for dataModelBindings property
        if (obj.TryGetProperty("dataModelBindings", out var bindings) && bindings.ValueKind == JsonValueKind.Object)
        {
            foreach (var binding in bindings.EnumerateObject())
            {
                ExtractDataTypeFromBinding(binding.Value, dataTypes);
            }
        }

        // Recurse into all properties
        foreach (var prop in obj.EnumerateObject())
        {
            TraverseForDataTypes(prop.Value, dataTypes);
        }
    }

    private static void ExtractDataTypeFromBinding(JsonElement bindingValue, HashSet<string> dataTypes)
    {
        // Binding can be either a string (simple) or an object with dataType property
        if (bindingValue.ValueKind == JsonValueKind.Object)
        {
            if (bindingValue.TryGetProperty("dataType", out var dataType) && dataType.ValueKind == JsonValueKind.String)
            {
                var dataTypeStr = dataType.GetString();
                if (!string.IsNullOrEmpty(dataTypeStr))
                {
                    dataTypes.Add(dataTypeStr);
                }
            }
        }
        // String bindings use the default data type, which is already included
    }

    private static void TraverseForOptions(
        JsonElement element,
        Dictionary<string, List<Dictionary<string, string>>> staticOptions
    )
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                TraverseObjectForOptions(element, staticOptions);
                break;
            case JsonValueKind.Array:
                // Check if this is an optionLabel expression: ["optionLabel", "someId", ...]
                if (IsOptionLabelExpression(element, out var optionsIdFromExpr))
                {
                    AddStaticOptionVariant(staticOptions, optionsIdFromExpr, []);
                }

                foreach (var item in element.EnumerateArray())
                {
                    TraverseForOptions(item, staticOptions);
                }
                break;
        }
    }

    private static void TraverseObjectForOptions(
        JsonElement obj,
        Dictionary<string, List<Dictionary<string, string>>> staticOptions
    )
    {
        // Check if this looks like a component with optionsId
        if (obj.TryGetProperty("optionsId", out var optionsIdProp) && optionsIdProp.ValueKind == JsonValueKind.String)
        {
            var optionsId = optionsIdProp.GetString();
            if (!string.IsNullOrEmpty(optionsId) && IsStaticOptionComponent(obj))
            {
                AddStaticOptionVariant(staticOptions, optionsId, ExtractStaticQueryParams(obj));
            }
        }

        // Recurse into all properties
        foreach (var prop in obj.EnumerateObject())
        {
            TraverseForOptions(prop.Value, staticOptions);
        }
    }

    private static Dictionary<string, string> ExtractStaticQueryParams(JsonElement component)
    {
        if (!component.TryGetProperty("queryParameters", out var queryParams))
        {
            return [];
        }

        if (queryParams.ValueKind != JsonValueKind.Object)
        {
            return [];
        }

        var result = new Dictionary<string, string>();
        foreach (var param in queryParams.EnumerateObject())
        {
            result[param.Name] = JsonElementToString(param.Value);
        }

        return result;
    }

    private static bool IsStaticOptionComponent(JsonElement component)
    {
        // Exclude if has mapping property (dynamic options)
        if (component.TryGetProperty("mapping", out _))
        {
            return false;
        }

        // Check queryParameters are static (if present)
        if (component.TryGetProperty("queryParameters", out var queryParams))
        {
            return AreQueryParamsStatic(queryParams);
        }

        // No queryParameters means it's static
        return true;
    }

    private static bool AreQueryParamsStatic(JsonElement queryParams)
    {
        if (queryParams.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        foreach (var param in queryParams.EnumerateObject())
        {
            var kind = param.Value.ValueKind;
            // Only allow primitive values, not arrays (expressions) or objects
            if (
                kind != JsonValueKind.String
                && kind != JsonValueKind.Number
                && kind != JsonValueKind.True
                && kind != JsonValueKind.False
                && kind != JsonValueKind.Null
            )
            {
                return false;
            }
        }

        return true;
    }

    private static string JsonElementToString(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? string.Empty,
            JsonValueKind.Null => string.Empty,
            _ => value.ToString(),
        };
    }

    private static void AddStaticOptionVariant(
        Dictionary<string, List<Dictionary<string, string>>> staticOptions,
        string optionsId,
        Dictionary<string, string> queryParameters
    )
    {
        if (!staticOptions.TryGetValue(optionsId, out var variants))
        {
            variants = [];
            staticOptions[optionsId] = variants;
        }

        if (variants.Any(existing => QueryParametersEqual(existing, queryParameters)))
        {
            return;
        }

        variants.Add(queryParameters);
    }

    private static bool QueryParametersEqual(Dictionary<string, string> left, Dictionary<string, string> right)
    {
        if (left.Count != right.Count)
        {
            return false;
        }

        foreach (var (key, value) in left)
        {
            if (
                !right.TryGetValue(key, out var rightValue)
                || !string.Equals(value, rightValue, StringComparison.Ordinal)
            )
            {
                return false;
            }
        }

        return true;
    }

    private static bool IsOptionLabelExpression(JsonElement array, out string optionsId)
    {
        optionsId = string.Empty;

        if (array.ValueKind != JsonValueKind.Array || array.GetArrayLength() < 2)
        {
            return false;
        }

        var enumerator = array.EnumerateArray();
        if (!enumerator.MoveNext())
        {
            return false;
        }

        var first = enumerator.Current;
        if (first.ValueKind != JsonValueKind.String || first.GetString() != "optionLabel")
        {
            return false;
        }

        if (!enumerator.MoveNext())
        {
            return false;
        }

        var second = enumerator.Current;
        if (second.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        optionsId = second.GetString() ?? string.Empty;
        return !string.IsNullOrEmpty(optionsId);
    }
}
