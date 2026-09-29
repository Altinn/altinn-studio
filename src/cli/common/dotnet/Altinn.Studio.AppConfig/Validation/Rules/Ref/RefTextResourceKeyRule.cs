using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefTextResourceKeyRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-TEXT-RESOURCE-KEY",
            "Text-resource key should exist",
            "Values bound by textResourceBindings should match a key declared in some "
                + "resource.<lang>.json. Reported as a warning because Altinn renders an unknown "
                + "key as literal text — we can't statically distinguish a typo'd key from an "
                + "intentional literal. Strategy: silent when the value matches a declared key; "
                + "otherwise flagged, unless the value contains whitespace or markup angle-brackets "
                + "(clearly intentional inline text). A binding is flagged even when no resource "
                + "files exist yet — the key still needs declaring.",
            Severity.Warning
        );

    private const int MaxLikelyKeyLen = 128;

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.TextKey))
        {
            // Flag only key-shaped values — an undeclared literal may be intentional inline text.
            if (!Plausible(u.Value))
                continue;
            yield return Metadata.Report(
                $"text-resource key \"{u.Value}\" ({u.BindingName} on component \"{u.OwningComponentId}\") is not declared in any resource.<lang>.json",
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
}
