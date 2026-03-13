using System.Collections.Generic;
using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Handles `@xsdNamespaces`.
/// </summary>
public sealed class XsdNamespacesKeyword : IKeywordHandler
{
    public static readonly XsdNamespacesKeyword Instance = new();

    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string KeywordName = "@xsdNamespaces";

    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value)
    {
        var list = new List<(string Prefix, string Ns)>();
        foreach (var prop in value.EnumerateObject())
            list.Add((prop.Name, prop.Value.GetString()));
        return list;
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
