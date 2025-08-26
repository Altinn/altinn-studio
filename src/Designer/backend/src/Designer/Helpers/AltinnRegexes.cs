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
}
