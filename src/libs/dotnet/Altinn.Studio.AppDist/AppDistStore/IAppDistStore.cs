namespace Altinn.Studio.AppDist;

public interface IAppDistStore
{
    Task<bool> ContainsAsync(string version, CancellationToken cancellationToken);

    Task WriteAsync(string version, IReadOnlyList<AppDistFileEntry> files, CancellationToken cancellationToken);

    Task<Stream?> OpenFileAsync(string version, string path, CancellationToken cancellationToken);

    Task<IReadOnlyList<string>> ListFilesAsync(string version, CancellationToken cancellationToken);
}
