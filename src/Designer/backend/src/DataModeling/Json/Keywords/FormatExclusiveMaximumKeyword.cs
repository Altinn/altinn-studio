using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Used to represent exclusive maximum on the date types
/// </summary>
public sealed class FormatExclusiveMaximumKeyword : IKeywordHandler
{
    public static readonly FormatExclusiveMaximumKeyword Instance = new();
    internal const string KeywordName = "formatExclusiveMaximum";
    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value) => value.GetString();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
