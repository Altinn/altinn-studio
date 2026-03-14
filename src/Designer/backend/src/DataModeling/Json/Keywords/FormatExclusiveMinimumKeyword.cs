using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Used to represent exclusive minimum on the date types
/// </summary>
public sealed class FormatExclusiveMinimumKeyword : IKeywordHandler
{
    public static readonly FormatExclusiveMinimumKeyword Instance = new();
    internal const string KeywordName = "formatExclusiveMinimum";
    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value) => value.GetString();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
