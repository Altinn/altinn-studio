using System.Text.Json;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords;

/// <summary>
/// Adds @xsdAnyAttribute keyword to schema
/// </summary>
public sealed class XsdAnyAttributeKeyword : IKeywordHandler
{
    public static readonly XsdAnyAttributeKeyword Instance = new();

    /// <summary>
    /// The name of the keyword
    /// </summary>
    internal const string KeywordName = "@xsdAnyAttribute";

    public string Name => KeywordName;

    public object ValidateKeywordValue(JsonElement value)
    {
        string id = null,
            ns = null,
            pc = null;
        foreach (var prop in value.EnumerateObject())
        {
            switch (prop.Name)
            {
                case "Id":
                    id = prop.Value.GetString();
                    break;
                case "Namespace":
                    ns = prop.Value.GetString();
                    break;
                case "ProcessContent":
                    pc = prop.Value.GetString();
                    break;
            }
        }
        return (Id: id, Namespace: ns, ProcessContent: pc);
    }

    public void BuildSubschemas(KeywordData keyword, BuildContext context) { }

    public KeywordEvaluation Evaluate(KeywordData keyword, EvaluationContext context) => KeywordEvaluation.Ignore;
}
