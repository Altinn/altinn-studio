#nullable disable
using System.Text.RegularExpressions;

namespace Altinn.Studio.Designer.Helpers;

public partial class AltinnRegexes
{
    [GeneratedRegex("^[a-zA-Z0-9][a-zA-Z0-9-_\\.]*$")]
    public static partial Regex AltinnOrganizationNameRegex();

    [GeneratedRegex("^(?!datamodels$)[a-z]+[a-z0-9-]+[a-z0-9]$")]
    public static partial Regex AltinnAppNameRegex();

    [GeneratedRegex("^[a-zA-Z0-9-_\\.]*$")]
    public static partial Regex AltinnEnvironmentNameRegex();

    [GeneratedRegex("^[a-zA-Z0-9][a-zA-Z0-9-_\\.\\/\\(\\):]*$")]
    public static partial Regex AltinnBranchNameRegex();

    [GeneratedRegex(
        "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        RegexOptions.IgnoreCase
    )]
    public static partial Regex AltinnInstanceIdRegex();

    [GeneratedRegex("^[0-9a-f]{12}$", RegexOptions.IgnoreCase)]
    public static partial Regex AltinnArchiveReferenceRegex();
}
