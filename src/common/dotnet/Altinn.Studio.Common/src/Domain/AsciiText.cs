namespace Altinn.Studio.Common.Domain;

// char.IsAscii* is not in netstandard2.0, which an analyzer that uses this model compiles for.
internal static class AsciiText
{
    public static bool IsDigit(char c) => c is >= '0' and <= '9';

    public static bool IsLower(char c) => c is >= 'a' and <= 'z';

    public static bool IsLetter(char c) => IsLower(c) || c is >= 'A' and <= 'Z';

    public static bool IsLetterOrDigit(char c) => IsLetter(c) || IsDigit(c);
}
