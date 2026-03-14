using System.Collections.Generic;
using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Handles `@xsdSchemaAttributes`.
/// </summary>
public sealed class XsdSchemaAttributesKeyword : IKeywordHandler
{
    public static readonly XsdSchemaAttributesKeyword Instance = new();

    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string KeywordName = "@xsdSchemaAttributes";

    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value)
    {
        var list = new List<(string Name, string Value)>();
        foreach (var prop in value.EnumerateObject())
            list.Add((prop.Name, prop.Value.GetString()));
        return list;
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
