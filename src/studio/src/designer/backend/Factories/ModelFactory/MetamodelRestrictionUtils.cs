using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using Altinn.Studio.DataModeling.Utils;
using Altinn.Studio.Designer.ModelMetadatalModels;
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
    private static void AddStringRestrictions(JsonSchema subSchema, Dictionary<string, Restriction> restrictions)
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

        if (allOfKeyword.TryGetKeywordFromAllOfKeyword(out MaxLengthKeyword maxLengthKeyword))
        {
            restrictions.Add(maxLengthKeyword.Keyword(), new Restriction { Value = maxLengthKeyword.Value.ToString() });
        }

        if (allOfKeyword.TryGetKeywordFromAllOfKeyword(out PatternKeyword patternKeyword))
        {
            restrictions.Add(patternKeyword.Keyword(), new Restriction { Value = patternKeyword.Value.ToString() });
        }

        if (allOfKeyword.TryGetKeywordFromAllOfKeyword(out MinLengthKeyword minLengthKeyword))
        {
            restrictions.Add(minLengthKeyword.Keyword(), new Restriction { Value = minLengthKeyword.Value.ToString() });
        }
    }

    private static void AddEnumRestrictions(EnumKeyword enumKeyword, Dictionary<string, Restriction> restrictions)
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

            valueBuilder.Append(@enum.GetString());
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

        if (allOfKeyword.TryGetKeywordFromAllOfKeyword(out MaximumKeyword maximumKeyword))
        {
            restrictions.Add(maximumKeyword.Keyword(), new Restriction { Value = maximumKeyword.Value.ToString(CultureInfo.InvariantCulture) });
        }

        if (allOfKeyword.TryGetKeywordFromAllOfKeyword(out MinimumKeyword minimumKeyword))
        {
            restrictions.Add(minimumKeyword.Keyword(), new Restriction { Value = minimumKeyword.Value.ToString(CultureInfo.InvariantCulture) });
        }

        if (allOfKeyword.TryGetKeywordFromAllOfKeyword(out ExclusiveMaximumKeyword exclusiveMaximum))
        {
            restrictions.Add(exclusiveMaximum.Keyword(), new Restriction { Value = exclusiveMaximum.Value.ToString(CultureInfo.InvariantCulture) });
        }

        if (allOfKeyword.TryGetKeywordFromAllOfKeyword(out ExclusiveMinimumKeyword exclusiveMinimum))
        {
            restrictions.Add(exclusiveMinimum.Keyword(), new Restriction { Value = exclusiveMinimum.Value.ToString(CultureInfo.InvariantCulture) });
        }
    }

    private static bool TryGetKeywordFromAllOfKeyword<T>(this AllOfKeyword allOfKeyword, out T keyword)
        where T : IJsonSchemaKeyword
    {
        keyword = default;
        return allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<T>())
            ?.TryGetKeyword(out keyword) ?? false;
    }
}
