namespace Altinn.Studio.StudioctlServer.Discovery;

/// <summary>
/// An app started, but Localtest could not be reached to confirm that it routes to the app, so the app is not ready
/// for the developer. Usually the local environment is not running.
/// </summary>
public sealed class LocaltestUnavailableException : Exception
{
    public LocaltestUnavailableException() { }

    public LocaltestUnavailableException(string message)
        : base(message) { }

    public LocaltestUnavailableException(string message, Exception innerException)
        : base(message, innerException) { }
}
