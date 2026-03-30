using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds info keyword to schema
/// </summary>
public sealed class InfoKeyword : IKeywordHandler
{
    public static readonly InfoKeyword Instance = new();

    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string KeywordName = "info";

    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value)
    {
        return value.Clone();
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
