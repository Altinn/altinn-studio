using System;

namespace Altinn.Studio.Common.App;

/// <summary>Reads something from an app's source files, which whoever holds them passes in one at a time.</summary>
/// <remarks>
/// The caller asks <see cref="Accepts"/> for each file and passes the content of those it accepts, in any order, as
/// bytes while an archive is extracted or as text in an analyzer. Each analysis of apps is a reader of its own. Apps
/// are old and varied, so a reader treats malformed content as unknown rather than throwing. It is not thread-safe.
/// </remarks>
public interface IAppSourceReader
{
    /// <summary>Whether the reader needs the content of a file.</summary>
    bool Accepts(AppFilePath path);

    /// <summary>Reads a file that <see cref="Accepts"/> accepted, as UTF-8 bytes that are valid only during the call.</summary>
    void Read(AppFilePath path, ReadOnlyMemory<byte> content);

    /// <summary>Reads a file that <see cref="Accepts"/> accepted, as text.</summary>
    void Read(AppFilePath path, string content);
}
