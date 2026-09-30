namespace Altinn.App.Core.Features;

/// <summary>
/// Marks a builder stage that does not yet describe a usable registration: the value must be carried
/// on to whichever method completes it, never discarded. Staged builders make the wrong <em>order</em>
/// a compile error on their own — a stage exposes only the calls that are legal at that point — but
/// nothing in C# stops a caller from dropping the value entirely, which is what this attribute covers.
/// </summary>
/// <remarks>
/// Enforced at compile time by the <c>Altinn.App.Analyzers</c> package shipped to apps (which matches
/// this attribute by full name), and at app startup as a backstop wherever the feature can tell that
/// it was configured half-way.
/// </remarks>
/// <param name="guidance">
/// The remediation to append to the diagnostic — the call that completes the builder.
/// </param>
[AttributeUsage(AttributeTargets.Interface | AttributeTargets.Class, AllowMultiple = false)]
internal sealed class IncompleteBuilderAttribute(string guidance) : Attribute
{
    /// <summary>What the caller must do to complete the registration.</summary>
    public string Guidance => guidance;
}
