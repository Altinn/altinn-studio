// CA1308: Normalize strings to uppercase
#pragma warning disable CA1308

namespace WorkflowEngine.Data.Constants;

/// <summary>
/// Centralizes namespace normalization.
/// All namespace values are stored as trimmed lowercase.
/// </summary>
internal static class WorkflowNamespace
{
    private const int MaxLength = 200;

    /// <summary>
    /// Normalizes a namespace value: trims and lowercases.
    /// Throws <see cref="ArgumentException"/> if the result exceeds <see cref="MaxLength"/> characters
    /// or is empty/whitespace-only.
    /// </summary>
    public static string Normalize(string? ns)
    {
        if (string.IsNullOrWhiteSpace(ns))
            throw new ArgumentException("Namespace is required.", nameof(ns));

        var normalized = ns.Trim().ToLowerInvariant();

        if (normalized.Length > MaxLength)
            throw new ArgumentException($"Namespace exceeds maximum length of {MaxLength} characters.", nameof(ns));

        return normalized;
    }
}
