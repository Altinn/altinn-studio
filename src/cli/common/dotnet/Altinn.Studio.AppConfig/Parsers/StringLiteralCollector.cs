using System.Text.Json;
using System.Xml.Linq;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class StringLiteralCollector
{
    public static void Collect(ISet<string> into, JsonElement node)
    {
        switch (node.ValueKind)
        {
            case JsonValueKind.String:
                Add(into, node.GetString());
                break;
            case JsonValueKind.Array:
                foreach (var item in node.EnumerateArray())
                    Collect(into, item);
                break;
            case JsonValueKind.Object:
                foreach (var property in node.EnumerateObject())
                    Collect(into, property.Value);
                break;
        }
    }

    public static void Collect(ISet<string> into, XDocument document)
    {
        foreach (var element in document.Descendants())
        {
            foreach (var attribute in element.Attributes())
                Add(into, attribute.Value);
            if (!element.HasElements)
                Add(into, element.Value.Trim());
        }
    }

    private static void Add(ISet<string> into, string? value)
    {
        if (!string.IsNullOrEmpty(value))
            into.Add(value);
    }
}
