using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdMaxOccurs keyword to schema.
/// </summary>
public sealed class XsdMaxOccursKeyword : IKeywordHandler
{
    public static readonly XsdMaxOccursKeyword Instance = new();
    public string Name => "@xsdMaxOccurs";

    public object ValidateKeywordValue(JsonElement value) => value.GetString();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
