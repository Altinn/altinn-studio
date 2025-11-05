using System.Text.RegularExpressions;

namespace Altinn.Studio.Designer.Helpers;
public static partial class InputValidator
{

    public static bool IsInvalidCodeListTitle(string? title)
    {
        if (title is null)
        {
            return true;
        }
        return LatinCharacterAndNumbers_AllowUnderscoreAndHyphen().Match(title).Success is false;
    }

    public static bool IsValidGiteaCommitMessage(string? commitMessage)
    {
        if (string.IsNullOrWhiteSpace(commitMessage))
        {
            return false;
        }
        // Commit message must be between 1 and 5120 characters and not contain null characters
        // https://docs.gitea.com/administration/config-cheat-sheet
        char nullChar = '\0';
        if (commitMessage.Contains(nullChar))
        {
            return false;
        }

        return commitMessage.Length <= 5120;
    }

    [GeneratedRegex("^[a-zA-Z0-9][a-zA-Z0-9_-]*$", RegexOptions.NonBacktracking | RegexOptions.CultureInvariant)]
    private static partial Regex LatinCharacterAndNumbers_AllowUnderscoreAndHyphen();
}
