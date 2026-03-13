using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Json.Schema;
using static Altinn.Studio.DataModeling.Utils.RestrictionsHelper;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Equivalent of totalDigits restriction in json schema
/// </summary>
public sealed class XsdTotalDigitsKeyword : IKeywordHandler
{
    public static readonly XsdTotalDigitsKeyword Instance = new();

    public string Name => "totalDigits";

    public object ValidateKeywordValue(JsonElement value)
    {
        return (uint)value.GetUInt32();
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context)
    {
        var instance = context.Instance;

        if (instance.ValueKind is not JsonValueKind.Number)
        {
            return KeywordEvaluation.Ignore;
        }

        if (!instance.TryGetDecimal(out var number))
        {
            return new KeywordEvaluation
            {
                Keyword = Name,
                IsValid = false,
                Error = "Value is not a valid number",
            };
        }

        var totalDigits = (uint)keyword.Value;
        var numberString = number.ToString("G", NumberFormatInfo.InvariantInfo);

        if (!new Regex(TotalDigitsDecimalRegexString(totalDigits)).IsMatch(numberString))
        {
            return new KeywordEvaluation
            {
                Keyword = Name,
                IsValid = false,
                Error = $"Number has more than {totalDigits} total digits",
            };
        }

        return new KeywordEvaluation { Keyword = Name, IsValid = true };
    }
}
