namespace Altinn.Studio.AppDist;

/// <summary>
/// Retrieves app distribution artifacts from a remote or otherwise external source.
/// </summary>
public interface IAppDistSource
{
    /// <summary>
    /// Fetches one layer for <paramref name="version"/>.
    /// </summary>
    /// <returns>The layer files, or <see langword="null"/> when the version does not exist.</returns>
    /// <exception cref="AppDistSourceException">The source could not complete the request.</exception>
    /// <exception cref="AppDistArtifactException">The source returned an invalid artifact.</exception>
    Task<IReadOnlyList<AppDistFileEntry>?> FetchLayerAsync(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken
    );

    /// <summary>Lists versions currently available from this source.</summary>
    /// <exception cref="AppDistSourceException">The source could not complete the request.</exception>
    Task<IReadOnlyList<string>> ListVersionsAsync(CancellationToken cancellationToken);
}

/// <summary>A file retrieved from an app distribution source.</summary>
/// <param name="Path">The normalized path relative to the layer root.</param>
/// <param name="Content">The complete file content.</param>
public sealed record AppDistFileEntry(string Path, byte[] Content);
