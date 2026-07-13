namespace Altinn.Studio.AppDist;

public interface IAppDistSource
{
    Task<IReadOnlyList<AppDistFileEntry>> FetchAsync(string version, CancellationToken cancellationToken);
}

public sealed record AppDistFileEntry(string Path, byte[] Content);

public sealed class AppDistSourceUnavailableException : Exception
{
    public AppDistSourceUnavailableException(string message)
        : base(message) { }

    public AppDistSourceUnavailableException(string message, Exception innerException)
        : base(message, innerException) { }
}
