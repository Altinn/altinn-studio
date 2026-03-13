using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdMinOccurs keyword to schema.
/// </summary>
public sealed class XsdMinOccursKeyword : IKeywordHandler
{
    public static readonly XsdMinOccursKeyword Instance = new();
    public string Name => "@xsdMinOccurs";

    public object ValidateKeywordValue(JsonElement value) => value.GetInt32();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
