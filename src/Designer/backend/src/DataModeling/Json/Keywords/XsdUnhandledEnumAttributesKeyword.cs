using System.Collections.Generic;
using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Handles `@xsdUnhandledEnumAttributes`.
/// </summary>
public sealed class XsdUnhandledEnumAttributesKeyword : IKeywordHandler
{
    public static readonly XsdUnhandledEnumAttributesKeyword Instance = new();

    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string KeywordName = "@xsdUnhandledEnumAttributes";

    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value)
    {
        var list = new List<NamedKeyValuePairs>();
        foreach (var item in value.EnumerateObject())
        {
            var namedKeyValuePairs = new NamedKeyValuePairs(item.Name);
            foreach (var keyPair in item.Value.EnumerateObject())
            {
                namedKeyValuePairs.Add(keyPair.Name, keyPair.Value.ToString());
            }
            list.Add(namedKeyValuePairs);
        }
        return list;
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
