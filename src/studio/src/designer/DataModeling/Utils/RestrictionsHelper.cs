using System.Collections.Generic;
using System.Linq;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Utils;

/// <summary>
/// Utilities for
/// </summary>
public static class RestrictionsHelper
{
    private static readonly IReadOnlyCollection<string> DateTypes = new List<string>
    {
        "date",
        "dateTime",
        "duration",
        "gDay",
        "gMonth",
        "gMonthDay",
        "gYear",
        "gYearMonth",
        "time"
    };

    /// <summary>
    /// UsedFo
    /// </summary>
    public static bool IsRestrictionOnDateType(XmlSchemaFacet facet)
    {
        if (facet.Parent is not XmlSchemaSimpleTypeRestriction parent)
        {
            return false;
        }

        return DateTypes.Contains(parent?.BaseTypeName?.Name);
    }

    /// <summary>
    /// Gets the regex for total digits restriction. Note that for decimal data type total digits is
    /// number of digits both after and before the decimal point, not counting the decimal point itself.
    /// </summary>
    /// <param name="value">Total digits value</param>
    /// <returns>Regex string for total digits</returns>
    public static string TotalDigitsRegexString(uint value) => $@"^(([0-9]){{1}}(\.)?){{{value}}}$";
}
