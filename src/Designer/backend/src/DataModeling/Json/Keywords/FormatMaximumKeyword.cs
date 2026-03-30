using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Used to represent maximum on the date types
/// </summary>
public sealed class FormatMaximumKeyword : IKeywordHandler
{
    public static readonly FormatMaximumKeyword Instance = new();
    internal const string KeywordName = "formatMaximum";
    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value) => value.GetString();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
