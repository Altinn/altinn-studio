using System.Text.RegularExpressions;

namespace Altinn.Studio.AppConfig.Models;

internal sealed partial record LibraryCodeListReference(string Org, string CodeListId, string Version)
{
    public static LibraryCodeListReference? Parse(string optionsId)
    {
        var match = Pattern().Match(optionsId);
        return match.Success
            ? new(match.Groups["org"].Value, match.Groups["codeListId"].Value, match.Groups["version"].Value)
            : null;
    }

    [GeneratedRegex(@"^lib\*\*(?<org>[a-zA-Z0-9]+)\*\*(?<codeListId>[a-zA-Z0-9_-]+)\*\*(?<version>[a-zA-Z0-9._-]+)$")]
    private static partial Regex Pattern();
}
