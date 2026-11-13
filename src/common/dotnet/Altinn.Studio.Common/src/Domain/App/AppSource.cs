using System.Diagnostics.CodeAnalysis;

namespace Altinn.Studio.Common.Domain.App;

/// <summary>
/// The files of one app, such as the folder of its repository or an archive of it. It is the only source of an
/// <see cref="AppFilePath"/>, so code that holds one knows that a source had that file.
/// </summary>
/// <remarks>
/// This project reads no files. An implementation lists the files of its source, creates their paths with
/// <see cref="TryCreatePath"/>, and gives the files to an <see cref="IAppSourceReader"/>.
/// </remarks>
public abstract class AppSource
{
    /// <summary>
    /// Creates the path of a file this source has, from its path relative to the app's root with <c>/</c> between the
    /// segments. It refuses a path that would not stay inside the app: one that is absolute, has an empty segment or
    /// a segment that is <c>.</c> or <c>..</c>, or has <c>\</c> or NUL in it.
    /// </summary>
    protected static bool TryCreatePath(string? relativePath, [NotNullWhen(true)] out AppFilePath? path) =>
        AppFilePath.TryCreate(relativePath, out path);
}
