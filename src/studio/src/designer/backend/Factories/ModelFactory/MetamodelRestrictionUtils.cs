using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Altinn.Studio.Designer.Extensions;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Json.More;
using Json.Schema;

namespace Altinn.Studio.Designer.Factories.ModelFactory;

/// <summary>
/// Metamodel restrictions helper
/// </summary>
public static class MetamodelRestrictionUtils
{
    /// <summary>
    /// Getting restriction for given type from provided json Subschema.
    /// Currently calculating Restrictions only for following types:
    /// <see cref="BaseValueType.String"/>,
    /// <see cref="BaseValueType.PositiveInteger"/>,
    /// <see cref="BaseValueType.Decimal"/>,
    /// <see cref="BaseValueType.Integer"/>,
    /// <see cref="BaseValueType.NonNegativeInteger"/>,
    /// <see cref="BaseValueType.Long"/>,
    /// <see cref="BaseValueType.Double"/>,
    /// <see cref="BaseValueType.Int"/>,
    /// <see cref="BaseValueType.Short"/>
    /// </summary>
    /// <param name="xsdValueType">A <see cref="BaseValueType"/></param>
    /// <param name="subSchema">A <see cref="JsonSchema"/> holding restrictions in json schema</param>
    /// <returns></returns>
    public static Dictionary<string, Restriction> GetRestrictions(BaseValueType? xsdValueType, JsonSchema subSchema)
    {
        var restrictions = new Dictionary<string, Restriction>();
        if (xsdValueType == null)
        {
            return restrictions;
        }

        switch (xsdValueType)
        {
            case BaseValueType.String:
                AddStringRestrictions(subSchema, restrictions);
                break;

            case BaseValueType.PositiveInteger:
            case BaseValueType.Decimal:
            case BaseValueType.Integer:
            case BaseValueType.NonNegativeInteger:
            case BaseValueType.Long:
            case BaseValueType.Double:
            case BaseValueType.Int:
            case BaseValueType.Short:
                AddNumberRestrictions(subSchema, restrictions);
                break;
        }

        return restrictions;
    }

    /// <summary>
    /// Adding restrictions for string type.
    /// </summary>
    private static void AddStringRestrictions(JsonSchema subSchema, IDictionary<string, Restriction> restrictions)
    {
        var enumKeyword = subSchema.GetKeyword<EnumKeyword>();
        if (enumKeyword != null)
        {
            AddEnumRestrictions(enumKeyword, restrictions);
        }

        if (!subSchema.TryGetKeyword(out AllOfKeyword allOfKeyword))
        {
            return;
        }

        if (allOfKeyword.TryGetKeywordFromSubSchemas(out MaxLengthKeyword maxLengthKeyword))
        {
            restrictions.AddRestrictionFromKeyword(maxLengthKeyword);
        }

        if (allOfKeyword.TryGetKeywordFromSubSchemas(out PatternKeyword patternKeyword))
        {
            restrictions.AddRestrictionFromKeyword(patternKeyword);
        }

        if (allOfKeyword.TryGetKeywordFromSubSchemas(out MinLengthKeyword minLengthKeyword))
        {
            restrictions.AddRestrictionFromKeyword(minLengthKeyword);
        }
    }

    private static void AddEnumRestrictions(EnumKeyword enumKeyword, IDictionary<string, Restriction> restrictions)
    {
        if (enumKeyword == null)
        {
            return;
        }

        var valueBuilder = new StringBuilder();
        foreach (var @enum in enumKeyword.Values)
        {
            if (valueBuilder.Length > 0)
            {
                valueBuilder.Append(';');
            }

            valueBuilder.Append(@enum.AsString());
        }

        restrictions.Add("enumeration", new Restriction() { Value = valueBuilder.ToString() });
    }

    /// <summary>
    /// Adding restrictions for number types.
    /// </summary>
    private static void AddNumberRestrictions(JsonSchema subSchema, Dictionary<string, Restriction> restrictions)
    {
        if (!subSchema.TryGetKeyword(out AllOfKeyword allOfKeyword))
        {
            return;
        }

        if (allOfKeyword.TryGetKeywordFromSubSchemas(out MaximumKeyword maximumKeyword))
        {
            restrictions.AddRestrictionFromKeyword(maximumKeyword);
        }

        if (allOfKeyword.TryGetKeywordFromSubSchemas(out MinimumKeyword minimumKeyword))
        {
            restrictions.AddRestrictionFromKeyword(minimumKeyword);
        }

        if (allOfKeyword.TryGetKeywordFromSubSchemas(out ExclusiveMaximumKeyword exclusiveMaximum))
        {
            restrictions.AddRestrictionFromKeyword(exclusiveMaximum);
        }

        if (allOfKeyword.TryGetKeywordFromSubSchemas(out ExclusiveMinimumKeyword exclusiveMinimum))
        {
            restrictions.AddRestrictionFromKeyword(exclusiveMinimum);
        }

        if (allOfKeyword.TryGetKeywordFromSubSchemas(out XsdTotalDigitsKeyword totalDigitsKeyword))
        {
            restrictions.AddRestrictionFromKeyword(totalDigitsKeyword);
        }
    }

    private static bool TryGetKeywordFromSubSchemas<T>(this IJsonSchemaKeyword allOfKeyword, out T keyword)
        where T : IJsonSchemaKeyword
    {
        keyword = default;
        return allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<T>())
            ?.TryGetKeyword(out keyword) ?? false;
    }

    /// <summary>
    /// Supported types for keywords are:
    /// <see cref="MaxLengthKeyword"/>,
    /// <see cref="PatternKeyword"/>,
    /// <see cref="MinLengthKeyword"/>,
    /// <see cref="MaximumKeyword"/>,
    /// <see cref="MinimumKeyword"/>,
    /// <see cref="ExclusiveMaximumKeyword"/>,
    /// <see cref="ExclusiveMinimumKeyword"/>
    /// </summary>
    private static void AddRestrictionFromKeyword<T>(this IDictionary<string, Restriction> restrictions, T keyword)
        where T : IJsonSchemaKeyword
    {
        var valueString = keyword switch
        {
            MaxLengthKeyword kw => kw.Value.ToString(),
            PatternKeyword kw => kw.Value.ToString(),
            MinLengthKeyword kw => kw.Value.ToString(),
            MaximumKeyword kw => kw.Value.ToString(CultureInfo.InvariantCulture),
            MinimumKeyword kw => kw.Value.ToString(CultureInfo.InvariantCulture),
            ExclusiveMaximumKeyword kw => kw.Value.ToString(CultureInfo.InvariantCulture),
            ExclusiveMinimumKeyword kw => kw.Value.ToString(CultureInfo.InvariantCulture),
            XsdTotalDigitsKeyword kw => kw.Value.ToString(CultureInfo.InvariantCulture),
            _ => throw new Exception("Not supported keyword type")

        };
        restrictions.Add(keyword.Keyword(), new Restriction { Value = valueString });
    }
}
