using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdType keyword to schema
/// </summary>
public sealed class XsdTypeKeyword : IKeywordHandler
{
    public static readonly XsdTypeKeyword Instance = new();
    internal const string KeywordName = "@xsdType";
    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value)
    {
        var s = value.GetString();
        return string.IsNullOrWhiteSpace(s) ? "Element" : s;
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
