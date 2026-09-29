using System.Diagnostics.CodeAnalysis;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace Altinn.Studio.AppConfig.Parsers;

internal sealed partial class MsBuildProperties
{
    private readonly List<(string Name, string Value)> _definitions;

    private MsBuildProperties(List<(string Name, string Value)> definitions) => _definitions = definitions;

    public static MsBuildProperties Evaluate(IEnumerable<XDocument> documentsInEvaluationOrder) =>
        new(
            documentsInEvaluationOrder
                .SelectMany(doc => doc.Descendants().Where(e => e.Name.LocalName == "PropertyGroup"))
                .SelectMany(group => group.Elements())
                .Select(property => (property.Name.LocalName, property.Value.Trim()))
                .ToList()
        );

    public bool TryExpand(
        string value,
        [NotNullWhen(true)] out string? expanded,
        [NotNullWhen(false)] out string? problem
    ) => TryExpand(value, _definitions.Count, out expanded, out problem);

    private bool TryExpand(
        string value,
        int visibleDefinitions,
        [NotNullWhen(true)] out string? expanded,
        [NotNullWhen(false)] out string? problem
    )
    {
        var result = new StringBuilder();
        var index = 0;
        for (
            var start = value.IndexOf("$(", StringComparison.Ordinal);
            start >= 0;
            start = value.IndexOf("$(", index, StringComparison.Ordinal)
        )
        {
            result.Append(value, index, start - index);
            var end = value.IndexOf(')', start);
            var name = end < 0 ? "" : value[(start + 2)..end];
            if (!PropertyName().IsMatch(name))
            {
                expanded = null;
                problem = "cannot be evaluated: only plain $(Property) references are supported";
                return false;
            }
            var definition = LastDefinitionBefore(name, visibleDefinitions);
            if (definition < 0)
            {
                expanded = null;
                problem = $"cannot be resolved: property {name} is not defined";
                return false;
            }
            if (!TryExpand(_definitions[definition].Value, definition, out var nested, out problem))
            {
                expanded = null;
                return false;
            }
            result.Append(nested);
            index = end + 1;
        }
        result.Append(value, index, value.Length - index);
        expanded = result.ToString();
        problem = null;
        return true;
    }

    private int LastDefinitionBefore(string name, int end)
    {
        for (var i = end - 1; i >= 0; i--)
        {
            if (string.Equals(_definitions[i].Name, name, StringComparison.OrdinalIgnoreCase))
                return i;
        }
        return -1;
    }

    [GeneratedRegex("^[A-Za-z_][A-Za-z0-9_-]*$")]
    private static partial Regex PropertyName();
}
