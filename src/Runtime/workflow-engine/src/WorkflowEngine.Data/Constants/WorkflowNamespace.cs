// CA1308: Normalize strings to uppercase
#pragma warning disable CA1308

namespace WorkflowEngine.Data.Constants;

/// <summary>
/// Centralizes namespace normalization and the default namespace constant.
/// All namespace values are stored as lowercase; missing values fall back to <see cref="Default"/>.
/// </summary>
public static class WorkflowNamespace
{
    /// <summary>
    /// The global catch-all namespace used when no namespace is specified.
    /// </summary>
    public const string Default = "default";

    /// <summary>
    /// Normalizes a namespace value: trims, lowercases, and falls back to <see cref="Default"/> if null/empty.
    /// </summary>
    public static string Normalize(string? ns) =>
        string.IsNullOrWhiteSpace(ns) ? Default : ns.Trim().ToLowerInvariant();
}
