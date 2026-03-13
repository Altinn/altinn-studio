using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Used to represent minimum on the date types
/// </summary>
public sealed class FormatMinimumKeyword : IKeywordHandler
{
    public static readonly FormatMinimumKeyword Instance = new();
    internal const string KeywordName = "formatMinimum";
    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value) => value.GetString();

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
