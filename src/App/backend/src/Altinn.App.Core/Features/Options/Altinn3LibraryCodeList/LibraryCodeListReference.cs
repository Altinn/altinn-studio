using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

/// <summary>
/// The <c>lib**{org}**{codeListId}**{version}</c> syntax that references a code list in the Altinn 3 code list
/// library directly from a layout, without registering it in the app.
/// </summary>
internal static partial class LibraryCodeListReference
{
    [GeneratedRegex(@"^lib\*\*(?<org>[a-zA-Z0-9]+)\*\*(?<codeListId>[a-zA-Z0-9_-]+)\*\*(?<version>[a-zA-Z0-9._-]+)$")]
    private static partial Regex Pattern();

    /// <summary>
    /// Parses a library reference. The definition's id is the reference as written, so that the option list
    /// can be reported under the id the layout used.
    /// </summary>
    public static bool TryParse(string optionId, [NotNullWhen(true)] out LibraryCodeListDefinition? definition)
    {
        var match = Pattern().Match(optionId);
        if (!match.Success)
        {
            definition = null;
            return false;
        }

        definition = new LibraryCodeListDefinition(
            optionId,
            match.Groups["org"].Value,
            match.Groups["codeListId"].Value,
            match.Groups["version"].Value
        );
        return true;
    }
}
