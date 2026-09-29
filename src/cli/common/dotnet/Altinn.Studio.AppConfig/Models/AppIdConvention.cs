using System.Text.RegularExpressions;

namespace Altinn.Studio.AppConfig.Models;

internal static partial class AppIdConvention
{
    public static Regex Pattern => AppIdPattern();

    [GeneratedRegex(@"^([a-z0-9-]+)/([a-z0-9-]+)$")]
    private static partial Regex AppIdPattern();
}
