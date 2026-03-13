using System.Collections.Generic;
using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdAny keyword to schema
/// </summary>
public sealed class XsdAnyKeyword : IKeywordHandler
{
    public static readonly XsdAnyKeyword Instance = new();

    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string KeywordName = "@xsdAny";

    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value)
    {
        var list = new List<string>();
        foreach (var item in value.EnumerateArray())
            list.Add(item.GetString());
        return list;
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
