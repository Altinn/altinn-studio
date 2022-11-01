using System.Collections.Generic;
using System.Linq;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Utils;

/// <summary>
/// Utilities for
/// </summary>
public static class FormatRangeHelper
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
}
