namespace Altinn.Augmenter.Agent.Services;

public interface ICallbackUrlValidator
{
    /// <summary>
    /// Validates a callback URL against the configured allowlist.
    /// </summary>
    /// <returns>null if valid; otherwise an error message.</returns>
    string? Validate(string url);
}
