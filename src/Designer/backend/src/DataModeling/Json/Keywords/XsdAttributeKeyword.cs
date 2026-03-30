using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdAttribute keyword to schema
/// </summary>
public sealed class XsdAttributeKeyword : IKeywordHandler
{
    public static readonly XsdAttributeKeyword Instance = new();
    internal const string KeywordName = "@xsdAttribute";
    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value) => value.GetBoolean();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
