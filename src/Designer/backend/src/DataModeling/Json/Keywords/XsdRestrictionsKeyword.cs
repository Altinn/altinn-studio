using System.Collections.Generic;
using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Handles `@xsdRestrictions`.
/// </summary>
public sealed class XsdRestrictionsKeyword : IKeywordHandler
{
    public static readonly XsdRestrictionsKeyword Instance = new();

    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string KeywordName = "@xsdRestrictions";

    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value)
    {
        var list = new List<(string Name, JsonElement Value)>();
        foreach (var prop in value.EnumerateObject())
            list.Add((prop.Name, prop.Value.Clone()));
        return list;
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
