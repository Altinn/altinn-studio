namespace Altinn.App.Core.Extensions;

/// <summary>
/// Extension methods for string
/// </summary>
public static class StringExtensions
{
    /// <summary>
    /// Checks if a given character is contained more than once within a string.
    /// </summary>
    /// <returns>true if the string has more than one occurences of the provided char, otherwise false</returns>
    public static bool ContainsMoreThanOne(this string s, char ch)
    {
        if (s.IndexOf(ch) != s.LastIndexOf(ch))
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// Checks if a given character doesn't exists within a string
    /// </summary>
    /// <returns>true if the character does not contain the character, otherwise false</returns>
    public static bool DoesNotContain(this string s, char ch)
    {
        return !s.Contains(ch);
    }

    /// <summary>
    /// Checks if a given character exists within a string
    /// </summary>
    /// <returns>true if it contains exactly one, false if it contains zero or more than one</returns>
    public static bool ContainsExactlyOne(this string s, char ch)
    {
        if (!s.Contains(ch))
        {
            return false;
        }

        if (s.IndexOf(ch) == s.LastIndexOf(ch))
        {
            return true;
        }

        return false;
    }
}
