using System.Text.RegularExpressions;
using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed partial class BuiltinTextKeysTests
{
    [Fact]
    public void EmbeddedKeys_MatchTheSharedLanguageFiles()
    {
        var expected = new HashSet<string>(StringComparer.Ordinal);
        foreach (var language in new[] { "nb", "en", "nn" })
        {
            var source = File.ReadAllText(
                RepoFiles.Path("src", "common", "ts", "language", "src", "texts", language + ".ts")
            );
            foreach (Match match in TextKey().Matches(source))
                expected.Add(match.Groups[1].Value);
        }

        var missing = expected.Except(BuiltinTextKeys.Keys).Order(StringComparer.Ordinal).ToArray();
        var stale = BuiltinTextKeys.Keys.Except(expected).Order(StringComparer.Ordinal).ToArray();
        Assert.True(
            missing.Length == 0 && stale.Length == 0,
            $"builtin-text-keys.json is out of date; run Documents/Text/sync-builtin-text-keys.mjs. Missing: {string.Join(", ", missing)}. Stale: {string.Join(", ", stale)}"
        );
    }

    [GeneratedRegex("""^\s*['"]([^'"]+)['"]\s*:""", RegexOptions.Multiline)]
    private static partial Regex TextKey();
}
