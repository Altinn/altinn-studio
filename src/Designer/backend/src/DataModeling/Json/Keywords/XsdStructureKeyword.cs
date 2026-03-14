using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdStructure keyword to schema
/// </summary>
public sealed class XsdStructureKeyword : IKeywordHandler
{
    public static readonly XsdStructureKeyword Instance = new();
    internal const string KeywordName = "@xsdStructure";
    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value) => value.GetString();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
