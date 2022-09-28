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
public static class MetamodelRestrictionsHelper
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
    /// Adding restrictions for string for string type.
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

        if (allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<MaxLengthKeyword>())
                ?.TryGetKeyword(out MaxLengthKeyword maxLengthKeyword) ?? false)
        {
            restrictions.Add(maxLengthKeyword.Keyword(), new Restriction() { Value = maxLengthKeyword.Value.ToString() });
        }

        if (allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<PatternKeyword>())
                ?.TryGetKeyword(out PatternKeyword patternKeyword) ?? false)
        {
            restrictions.Add(patternKeyword.Keyword(), new Restriction() { Value = patternKeyword.Value.ToString() });
        }

        if (allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<MinLengthKeyword>())
                ?.TryGetKeyword(out MinLengthKeyword minLengthKeyword) ?? false)
        {
            restrictions.Add(minLengthKeyword.Keyword(), new Restriction() { Value = minLengthKeyword.Value.ToString() });
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
    /// Adding restrictions for string for number types.
    /// </summary>
    private static void AddNumberRestrictions(JsonSchema subSchema, Dictionary<string, Restriction> restrictions)
    {
        if (!subSchema.TryGetKeyword(out AllOfKeyword allOfKeyword))
        {
            return;
        }

        if (allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<MaximumKeyword>())
                ?.TryGetKeyword(out MaximumKeyword maxKeyword) ?? false)
        {
            restrictions.Add(maxKeyword.Keyword(), new Restriction() { Value = maxKeyword.Value.ToString(CultureInfo.InvariantCulture) });
        }

        if (allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<MinimumKeyword>())
                ?.TryGetKeyword(out MinimumKeyword minKeyword) ?? false)
        {
            restrictions.Add(minKeyword.Keyword(), new Restriction() { Value = minKeyword.Value.ToString(CultureInfo.InvariantCulture) });
        }

        if (allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<ExclusiveMaximumKeyword>())
                ?.TryGetKeyword(out ExclusiveMaximumKeyword exclusiveMaxKeyword) ?? false)
        {
            restrictions.Add(exclusiveMaxKeyword.Keyword(), new Restriction() { Value = exclusiveMaxKeyword.Value.ToString(CultureInfo.InvariantCulture) });
        }

        if (allOfKeyword.GetSubschemas().FirstOrDefault(s => s.HasKeyword<ExclusiveMinimumKeyword>())
                ?.TryGetKeyword(out ExclusiveMinimumKeyword exclusiveMinKeyword) ?? false)
        {
            restrictions.Add(exclusiveMinKeyword.Keyword(), new Restriction() { Value = exclusiveMinKeyword.Value.ToString(CultureInfo.InvariantCulture) });
        }
    }
}
