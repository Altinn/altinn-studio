using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdRootElement keyword to schema.
/// </summary>
public sealed class XsdRootElementKeyword : IKeywordHandler
{
    public static readonly XsdRootElementKeyword Instance = new();
    internal const string KeywordName = "@xsdRootElement";
    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value) => value.GetString();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
