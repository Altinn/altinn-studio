namespace Altinn.Studio.Fleet;

/// <summary>Gives the Altinn Studio API keys a sync uses to look up releases and download apps.</summary>
/// <remarks>
/// A sync asks once per installation and keeps the key in memory until it ends. A command-line host may ask a
/// credential helper; a service may read a mounted secret.
/// </remarks>
public interface IStudioCredentials
{
    /// <summary>Returns the API key for an installation, or <c>null</c> when there is none.</summary>
    /// <exception cref="StudioCredentialsException">The credentials cannot be read at all.</exception>
    ValueTask<string?> GetApiKey(StudioHost host, CancellationToken cancellationToken);
}

/// <summary>Thrown when the credentials cannot be read at all, such as when a credential helper is missing.</summary>
public sealed class StudioCredentialsException : Exception
{
    /// <summary>Creates an exception.</summary>
    public StudioCredentialsException() { }

    /// <summary>Creates an exception with a message.</summary>
    public StudioCredentialsException(string message)
        : base(message) { }

    /// <summary>Creates an exception with a message and its cause.</summary>
    public StudioCredentialsException(string message, Exception innerException)
        : base(message, innerException) { }
}
