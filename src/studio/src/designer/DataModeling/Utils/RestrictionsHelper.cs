using System.Collections.Generic;
using System.Linq;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Utils;

/// <summary>
/// Utilities for
/// </summary>
public static class RestrictionsHelper
{
    /// <summary>
    /// UsedFo
    /// </summary>
    public static bool IsRestrictionOnDateType(XmlSchemaFacet facet)
    {
        if (facet.Parent is not XmlSchemaSimpleTypeRestriction parent)
        {
            return false;
        }

        return XmlSchemaTypes.DateTypes.Contains(parent?.BaseTypeName?.Name);
    }

    /// <summary>
    /// Gets the regex for total digits restriction for integers.
    /// </summary>
    /// <param name="value">Total digits value</param>
    /// <returns>Regex string for total digits</returns>
    public static string TotalDigitsIntegerRegexString(uint value) => $@"^[0-9]{{0,{value}}}$";

    /// <summary>
    /// Gets the regex for total digits restriction for decimal data type.
    /// </summary>
    /// <param name="value">Total digits value</param>
    /// <returns>Regex string for total digits</returns>
    public static string TotalDigitsDecimalRegexString(uint value) => $@"^(([0-9]){{1}}(\.)?){{0,{value}}}$";
}
