using System.Text.Json;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Analyzes layout JSON to extract referenced data types and options references.
/// </summary>
internal sealed class LayoutAnalysisService
{
    public static HashSet<string> GetReferencedDataTypes(object layoutsJson, string defaultDataType)
    {
        var dataTypes = new HashSet<string> { defaultDataType };

        var json = ConvertToJsonElement(layoutsJson);
        TraverseForDataTypes(json, dataTypes);

        return dataTypes;
    }

    public static StaticOptionsAnalysisResult GetStaticOptionsReferences(object layoutsJson)
    {
        var allReferencedOptionIds = new HashSet<string>();
        var staticallyConfiguredOptionIds = new HashSet<string>();

        var json = ConvertToJsonElement(layoutsJson);
        TraverseForOptions(json, allReferencedOptionIds, staticallyConfiguredOptionIds);

        return new StaticOptionsAnalysisResult
        {
            AllReferencedOptionIds = allReferencedOptionIds,
            StaticallyConfiguredOptionIds = staticallyConfiguredOptionIds,
        };
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
        HashSet<string> allReferenced,
        HashSet<string> staticallyConfigured
    )
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                TraverseObjectForOptions(element, allReferenced, staticallyConfigured);
                break;
            case JsonValueKind.Array:
                // Check if this is an optionLabel expression: ["optionLabel", "someId", ...]
                if (IsOptionLabelExpression(element, out var optionsIdFromExpr))
                {
                    allReferenced.Add(optionsIdFromExpr);
                    staticallyConfigured.Add(optionsIdFromExpr);
                }

                foreach (var item in element.EnumerateArray())
                {
                    TraverseForOptions(item, allReferenced, staticallyConfigured);
                }
                break;
        }
    }

    private static void TraverseObjectForOptions(
        JsonElement obj,
        HashSet<string> allReferenced,
        HashSet<string> staticallyConfigured
    )
    {
        // Check if this looks like a component with optionsId
        if (obj.TryGetProperty("optionsId", out var optionsIdProp) && optionsIdProp.ValueKind == JsonValueKind.String)
        {
            var optionsId = optionsIdProp.GetString();
            if (!string.IsNullOrEmpty(optionsId))
            {
                allReferenced.Add(optionsId);
                if (IsStaticallyConfiguredComponent(obj))
                {
                    staticallyConfigured.Add(optionsId);
                }
            }
        }

        // Recurse into all properties
        foreach (var prop in obj.EnumerateObject())
        {
            TraverseForOptions(prop.Value, allReferenced, staticallyConfigured);
        }
    }

    private static bool IsStaticallyConfiguredComponent(JsonElement component)
    {
        // "Empty" means missing, null, or {}.
        return IsMissingNullOrEmptyObject(component, "mapping")
            && IsMissingNullOrEmptyObject(component, "queryParameters");
    }

    private static bool IsMissingNullOrEmptyObject(JsonElement component, string propertyName)
    {
        if (!component.TryGetProperty(propertyName, out var property))
        {
            return true;
        }

        return property.ValueKind switch
        {
            JsonValueKind.Null => true,
            JsonValueKind.Object => !property.EnumerateObject().Any(),
            _ => false,
        };
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

internal sealed class StaticOptionsAnalysisResult
{
    public required HashSet<string> AllReferencedOptionIds { get; init; }

    public required HashSet<string> StaticallyConfiguredOptionIds { get; init; }
}
