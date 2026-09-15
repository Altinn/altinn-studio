namespace WorkflowEngine.Core.Utils;

/// <summary>
/// Parses enum query-parameter values by their declared name, and nothing else.
/// </summary>
/// <remarks>
/// <c>Enum.TryParse</c> also accepts the underlying numeric strings ("0", "4"), which none of
/// this engine's query-parameter contracts offer. A caller sending <c>?status=4</c> means
/// nothing by it, and reading it as <c>Failed</c> turns a typo into a silent filter.
/// <c>Enum.IsDefined</c> does not help: "4" parses to a defined member. Every endpoint that
/// accepts an enum by name goes through here, so the accepted spellings cannot drift apart
/// between the public API and the dashboard.
/// </remarks>
internal static class EnumNames
{
    /// <summary>
    /// Matches <paramref name="value"/> against the declared names of <typeparamref name="TEnum"/>,
    /// case-insensitively.
    /// </summary>
    public static bool TryParse<TEnum>(string? value, out TEnum parsed)
        where TEnum : struct, Enum
    {
        if (value is not null)
        {
            foreach (var name in Declared<TEnum>.Names)
            {
                if (name.Equals(value, StringComparison.OrdinalIgnoreCase))
                {
                    parsed = Enum.Parse<TEnum>(name);
                    return true;
                }
            }
        }

        parsed = default;
        return false;
    }

    /// <summary>The declared names, for the "valid values are ..." half of a rejection message.</summary>
    public static string[] Of<TEnum>()
        where TEnum : struct, Enum => Declared<TEnum>.Names;

    private static class Declared<TEnum>
        where TEnum : struct, Enum
    {
        public static readonly string[] Names = Enum.GetNames<TEnum>();
    }
}
