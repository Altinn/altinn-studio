using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdNillable keyword to schema indicating if member should be treated as XML text when serialized or deserialized.
/// </summary>
public sealed class XsdNillableKeyword : IKeywordHandler
{
    public static readonly XsdNillableKeyword Instance = new();
    public string Name => "@xsdNillable";

    public object ValidateKeywordValue(JsonElement value) => value.GetBoolean();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
