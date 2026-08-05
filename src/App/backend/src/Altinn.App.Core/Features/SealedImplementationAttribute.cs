namespace Altinn.App.Core.Features;

/// <summary>
/// Marks a default interface implementation as final: implementing classes must let this
/// implementation win, never providing their own. Enforced at compile time by the
/// <c>Altinn.App.Analyzers</c> package shipped to apps, and at app startup as a backstop.
/// </summary>
/// <param name="guidance">
/// The remediation to append to the diagnostic — what the implementer should do instead.
/// </param>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Property, AllowMultiple = false)]
internal sealed class SealedImplementationAttribute(string guidance) : Attribute
{
    /// <summary>What the implementer should do instead of re-implementing the member.</summary>
    public string Guidance => guidance;
}
