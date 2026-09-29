using System.Globalization;

namespace LocalTest.Helpers;

public static class GuidHelpers
{
    public static Guid? FromInt(int? value)
    {
        if (value == null)
        {
            return null;
        }
        if(value < 0)
        {
            // Add a 1 in front of negative values
            return Guid.ParseExact("1" + (1-value.Value).ToString("D31", CultureInfo.InvariantCulture), "N");
        }

        return Guid.ParseExact(value.Value.ToString("D32", CultureInfo.InvariantCulture), "N");
    }
}
