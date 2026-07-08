using System.Text.RegularExpressions;

namespace Altinn.Studio.AppConfig.Models;

internal static class AppIdConvention
{
    public static readonly Regex Pattern = new(@"^([a-z0-9-]+)/([a-z0-9-]+)$", RegexOptions.Compiled);
}
