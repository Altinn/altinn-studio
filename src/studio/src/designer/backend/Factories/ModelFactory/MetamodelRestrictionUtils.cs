using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Utils;
using Altinn.Studio.Designer.Extensions;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Json.Schema;

namespace Altinn.Studio.Designer.Factories.ModelFactory;

/// <summary>
/// Metamodel restrictions helper
/// </summary>
public static class MetamodelRestrictionUtils
{
    private static IEnumerable<Type> SupportedStringRestrictions => new List<Type>
    {
        typeof(MaxLengthKeyword),
        typeof(PatternKeyword),
        typeof(MinLengthKeyword),
    };

    private static IEnumerable<Type> SupportedNumberRestrictions => new List<Type>
    {
        typeof(MaximumKeyword),
        typeof(MinimumKeyword),
        typeof(ExclusiveMaximumKeyword),
        typeof(ExclusiveMinimumKeyword),
        typeof(XsdTotalDigitsKeyword)
    };

    private static IEnumerable<Type> AllSupportedRestrictions =>
        SupportedNumberRestrictions.Union(SupportedStringRestrictions);

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
    /// <param name="restrictions">Restrictions dictionary</param>
    public static void EnrichRestrictions(BaseValueType? xsdValueType, JsonSchema subSchema, Dictionary<string, Restriction> restrictions)
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
    /// Populates restrictions from subschemas
    /// </summary>
    /// <param name="allOfKeyword">Composition keyword.</param>
    /// <param name="restrictions">Restrictions dictionary to populate.</param>
    public static void PopulateRestrictions(AllOfKeyword allOfKeyword, Dictionary<string, Restriction> restrictions)
    {
        foreach (var restrictionKeywordType in AllSupportedRestrictions)
        {
            if (allOfKeyword.TryGetKeywordFromSubSchemas(restrictionKeywordType, out var keyword))
            {
                restrictions.AddRestrictionFromKeyword(keyword);
            }
        }
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

        if (subSchema.TryGetKeyword(out AllOfKeyword allOfKeyword))
        {
            AddNestedStringRestrictions(allOfKeyword, restrictions);
            return;
        }

        foreach (var restrictionKeywordType in SupportedStringRestrictions)
        {
            if (subSchema.TryGetKeywordByType(restrictionKeywordType, out var keyword))
            {
                restrictions.AddRestrictionFromKeyword(keyword);
            }
        }
    }

    private static void AddNestedStringRestrictions(IJsonSchemaKeyword allOfKeyword, IDictionary<string, Restriction> restrictions)
    {
        foreach (var restrictionKeywordType in SupportedStringRestrictions)
        {
            if (allOfKeyword.TryGetKeywordFromSubSchemas(restrictionKeywordType, out var keyword))
            {
                restrictions.AddRestrictionFromKeyword(keyword);
            }
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

        restrictions.TryAdd("enumeration", new Restriction() { Value = valueBuilder.ToString() });
    }

    /// <summary>
    /// Adding restrictions for number types.
    /// </summary>
    private static void AddNumberRestrictions(JsonSchema subSchema, Dictionary<string, Restriction> restrictions)
    {
        if (subSchema.TryGetKeyword(out AllOfKeyword allOfKeyword))
        {
            AddNestedNumberRestrictions(allOfKeyword, restrictions);
            return;
        }

        foreach (var restrictionKeywordType in SupportedNumberRestrictions)
        {
            if (subSchema.TryGetKeywordByType(restrictionKeywordType, out var keyword))
            {
                restrictions.AddRestrictionFromKeyword(keyword);
            }
        }
    }

    private static void AddNestedNumberRestrictions(IJsonSchemaKeyword allOfKeyword, IDictionary<string, Restriction> restrictions)
    {
        foreach (var restrictionKeywordType in SupportedNumberRestrictions)
        {
            if (allOfKeyword.TryGetKeywordFromSubSchemas(restrictionKeywordType, out var keyword))
            {
                restrictions.AddRestrictionFromKeyword(keyword);
            }
        }
    }

    private static bool TryGetKeywordFromSubSchemas(this IJsonSchemaKeyword allOfKeyword, Type type, out IJsonSchemaKeyword keyword)
    {
        keyword = default;
        return allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword(type))
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
        restrictions.TryAdd(keyword.Keyword(), new Restriction { Value = valueString });
    }

    private static bool TryGetKeywordByType(this JsonSchema schema, Type type, out IJsonSchemaKeyword keyword)
    {
        keyword = schema?.Keywords?.SingleOrDefault(k => k.GetType() == type);

        return keyword != null;
    }

    private static bool HasKeyword(this JsonSchema schema, Type type)
    {
        if (schema?.Keywords == null)
        {
            return false;
        }

        return schema.Keywords.Any(keyword => keyword.GetType() == type);
    }
}
