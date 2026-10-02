using System.Buffers;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefTextResourceKeyRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-TEXT-RESOURCE-KEY",
            "Text-resource key should exist",
            "Values bound by textResourceBindings should match a key declared in some "
                + "resource.<lang>.json. Altinn renders an unknown key as literal text, so a mistyped "
                + "key shows its raw id to the user. Silent when the value matches a declared or "
                + "built-in key, or contains whitespace or markup angle-brackets (clearly intentional "
                + "inline text), and for texts the frontend never renders: those of a component or "
                + "page with hidden: true, requiredValidation and shortName on a component that is "
                + "never required, and tableTitle on a component that is not a RepeatingGroup "
                + "child. Reported as info when the value reads as literal text — it contains "
                + "@, :, / or +, has no letters, ends in a period, or is a single capitalized word or "
                + "a .no host name — and no declared key is spelled like it. Otherwise reported as a "
                + "warning, even when no resource files exist yet: the key still needs declaring.",
            Severity.Warning
        );

    private const int MaxLikelyKeyLen = 128;

    private static readonly SearchValues<char> _addressCharacters = SearchValues.Create("@:/+");

    public IEnumerable<Finding> Check(AppModel app)
    {
        var declared = app.TextResources.SelectMany(t => t.Ids.Keys).ToHashSet(StringComparer.Ordinal);
        var neverRendered = new NeverRenderedTexts(app);
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.TextKey))
        {
            if (!Plausible(u.Value) || neverRendered.Contains(u.Position))
                continue;
            if (ReadsAsLiteralText(u.Value) && NameDistance.Closest(u.Value, declared) is null)
                yield return Metadata.Report(
                    $"\"{u.Value}\" ({ReferenceSource.BindingOn(u.BindingName, u.OwningComponentId)}) is not a declared text-resource key, so the app shows it as written in every language",
                    u.Position,
                    Severity.Info
                );
            else
                yield return Metadata.Report(
                    $"text-resource key \"{u.Value}\" ({ReferenceSource.BindingOn(u.BindingName, u.OwningComponentId)}) is not declared in any resource.<lang>.json",
                    u.Position
                );
        }
    }

    private static bool Plausible(string v)
    {
        if (string.IsNullOrEmpty(v) || v.Length > MaxLikelyKeyLen)
            return false;
        foreach (var c in v)
        {
            // Whitespace or markup angle-brackets mean literal inline text (e.g. "<br>"), not a key.
            if (c is ' ' or '\t' or '\n' or '\r' or '<' or '>')
                return false;
        }
        return true;
    }

    private static bool ReadsAsLiteralText(string v) =>
        v.AsSpan().ContainsAny(_addressCharacters)
        || !v.Any(char.IsLetter)
        || v.EndsWith('.')
        || IsCapitalizedWord(v)
        || IsNorwegianHostName(v);

    private static bool IsCapitalizedWord(string v) =>
        v.Length > 1 && char.IsUpper(v[0]) && v.Skip(1).All(char.IsLower);

    private static bool IsNorwegianHostName(string v)
    {
        var labels = v.Split('.');
        return labels.Length > 1
            && string.Equals(labels[^1], "no", StringComparison.Ordinal)
            && labels.All(l => l.Length > 0 && l.All(c => char.IsLetterOrDigit(c) || c == '-'));
    }
}
