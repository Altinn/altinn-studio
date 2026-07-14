namespace Altinn.Studio.AppDist;

public interface IAppDistStore
{
    Task<bool> ContainsAsync(string version, AppDistLayer layer, CancellationToken cancellationToken);

    Task WriteAsync(
        string version,
        AppDistLayer layer,
        IReadOnlyList<AppDistFileEntry> files,
        CancellationToken cancellationToken
    );

    Task<Stream?> OpenFileAsync(string version, AppDistLayer layer, string path, CancellationToken cancellationToken);

    Task<IReadOnlyList<string>> ListFilesAsync(string version, AppDistLayer layer, CancellationToken cancellationToken);
}
