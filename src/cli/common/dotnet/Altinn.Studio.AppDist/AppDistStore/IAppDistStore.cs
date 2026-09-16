namespace Altinn.Studio.AppDist;

/// <summary>
/// Stores validated app distribution layers for later read access.
/// </summary>
public interface IAppDistStore
{
    /// <summary>Determines whether a complete layer is stored.</summary>
    Task<bool> Contains(string version, AppDistLayer layer, CancellationToken cancellationToken);

    /// <summary>Atomically replaces a stored layer with <paramref name="files"/>.</summary>
    Task Write(
        string version,
        AppDistLayer layer,
        IReadOnlyList<AppDistFileEntry> files,
        CancellationToken cancellationToken
    );

    /// <summary>Opens a stored file, or returns <see langword="null"/> when it does not exist.</summary>
    Task<Stream?> OpenFile(string version, AppDistLayer layer, string path, CancellationToken cancellationToken);

    /// <summary>Lists every file path in a stored layer.</summary>
    Task<IReadOnlyList<string>> ListFiles(string version, AppDistLayer layer, CancellationToken cancellationToken);

    /// <summary>Lists versions for which the specified layer is completely stored.</summary>
    Task<IReadOnlyList<string>> ListVersions(AppDistLayer layer, CancellationToken cancellationToken);
}
