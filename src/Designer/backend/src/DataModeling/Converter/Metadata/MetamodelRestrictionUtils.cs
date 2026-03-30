using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.DataModeling.Utils;
using Json.Schema;
using Json.Schema.Keywords;

namespace Altinn.Studio.DataModeling.Converter.Metadata;

/// <summary>
/// Metamodel restrictions helper
/// </summary>
public static class MetamodelRestrictionUtils
{
    private static IEnumerable<Type> SupportedStringRestrictions =>
        new List<Type> { typeof(MaxLengthKeyword), typeof(PatternKeyword), typeof(MinLengthKeyword) };

    private static IEnumerable<Type> SupportedNumberRestrictions =>
        new List<Type>
        {
            typeof(MaximumKeyword),
            typeof(MinimumKeyword),
            typeof(ExclusiveMaximumKeyword),
            typeof(ExclusiveMinimumKeyword),
            typeof(XsdTotalDigitsKeyword),
        };

    private static IEnumerable<Type> AllSupportedRestrictions =>
        SupportedNumberRestrictions.Union(SupportedStringRestrictions);

    /// <summary>
    /// Getting restriction for given type from provided json Subschema.
    /// </summary>
    public static void EnrichRestrictions(
        BaseValueType? xsdValueType,
        JsonSchema subSchema,
        Dictionary<string, Restriction> restrictions
    )
    {
        if (xsdValueType == null)
        {
            return;
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
    }

    /// <summary>
    /// Populates restrictions from subschemas of an allOf keyword.
    /// </summary>
    public static void PopulateRestrictions(KeywordData allOfKeywordData, Dictionary<string, Restriction> restrictions)
    {
        var subSchemas = allOfKeywordData.GetSubSchemas();
        foreach (var restrictionKeywordType in AllSupportedRestrictions)
        {
            if (TryGetKeywordFromSubSchemas(subSchemas, restrictionKeywordType, out var kd))
            {
                restrictions.AddRestrictionFromKeyword(kd);
            }
        }
    }

    private static void AddStringRestrictions(JsonSchema subSchema, IDictionary<string, Restriction> restrictions)
    {
        var enumKd = subSchema.FindKeywordByHandler<EnumKeyword>();
        if (enumKd != null)
        {
            AddEnumRestrictions(enumKd, restrictions);
        }

        if (subSchema.TryGetKeyword<AllOfKeyword>(out var allOfKd))
        {
            AddNestedStringRestrictions(allOfKd, restrictions);
            return;
        }

        foreach (var restrictionKeywordType in SupportedStringRestrictions)
        {
            if (TryGetKeywordByHandlerType(subSchema, restrictionKeywordType, out var kd))
            {
                restrictions.AddRestrictionFromKeyword(kd);
            }
        }
    }

    private static void AddNestedStringRestrictions(KeywordData allOfKd, IDictionary<string, Restriction> restrictions)
    {
        var subSchemas = allOfKd.GetSubSchemas();
        foreach (var restrictionKeywordType in SupportedStringRestrictions)
        {
            if (TryGetKeywordFromSubSchemas(subSchemas, restrictionKeywordType, out var kd))
            {
                restrictions.AddRestrictionFromKeyword(kd);
            }
        }
    }

    private static void AddEnumRestrictions(KeywordData enumKd, IDictionary<string, Restriction> restrictions)
    {
        var valueBuilder = new StringBuilder();
        foreach (var item in enumKd.RawValue.EnumerateArray())
        {
            if (valueBuilder.Length > 0)
            {
                valueBuilder.Append(';');
            }

            valueBuilder.Append(item.ToString());
        }

        restrictions.TryAdd("enumeration", new Restriction() { Value = valueBuilder.ToString() });
    }

    private static void AddNumberRestrictions(JsonSchema subSchema, Dictionary<string, Restriction> restrictions)
    {
        if (subSchema.TryGetKeyword<AllOfKeyword>(out var allOfKd))
        {
            AddNestedNumberRestrictions(allOfKd, restrictions);
            return;
        }

        foreach (var restrictionKeywordType in SupportedNumberRestrictions)
        {
            if (TryGetKeywordByHandlerType(subSchema, restrictionKeywordType, out var kd))
            {
                restrictions.AddRestrictionFromKeyword(kd);
            }
        }
    }

    private static void AddNestedNumberRestrictions(KeywordData allOfKd, IDictionary<string, Restriction> restrictions)
    {
        var subSchemas = allOfKd.GetSubSchemas();
        foreach (var restrictionKeywordType in SupportedNumberRestrictions)
        {
            if (TryGetKeywordFromSubSchemas(subSchemas, restrictionKeywordType, out var kd))
            {
                restrictions.AddRestrictionFromKeyword(kd);
            }
        }
    }

    private static bool TryGetKeywordFromSubSchemas(
        IReadOnlyList<JsonSchema> subSchemas,
        Type handlerType,
        out KeywordData keyword
    )
    {
        keyword = null;
        foreach (var s in subSchemas)
        {
            if (HasKeywordOfHandlerType(s, handlerType))
            {
                if (TryGetKeywordByHandlerType(s, handlerType, out keyword))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static void AddRestrictionFromKeyword(this IDictionary<string, Restriction> restrictions, KeywordData kd)
    {
        var valueString = kd.Handler switch
        {
            MaxLengthKeyword => kd.GetLongValue().ToString(),
            PatternKeyword => ((System.Text.RegularExpressions.Regex)kd.Value).ToString(),
            MinLengthKeyword => kd.GetLongValue().ToString(),
            MaximumKeyword => kd.GetDecimalValue().ToString(CultureInfo.InvariantCulture),
            MinimumKeyword => kd.GetDecimalValue().ToString(CultureInfo.InvariantCulture),
            ExclusiveMaximumKeyword => kd.GetDecimalValue().ToString(CultureInfo.InvariantCulture),
            ExclusiveMinimumKeyword => kd.GetDecimalValue().ToString(CultureInfo.InvariantCulture),
            XsdTotalDigitsKeyword => ((uint)kd.Value).ToString(CultureInfo.InvariantCulture),
            _ => throw new Exception("Not supported keyword type"),
        };
        restrictions.TryAdd(kd.Handler.Name, new Restriction { Value = valueString });
    }

    private static bool TryGetKeywordByHandlerType(this JsonSchema schema, Type handlerType, out KeywordData keyword)
    {
        keyword = schema.GetKeywords()?.SingleOrDefault(k => k.Handler.GetType() == handlerType);
        return keyword != null;
    }

    private static bool HasKeywordOfHandlerType(this JsonSchema schema, Type handlerType)
    {
        return schema.GetKeywords()?.Any(k => k.Handler.GetType() == handlerType) ?? false;
    }
}
