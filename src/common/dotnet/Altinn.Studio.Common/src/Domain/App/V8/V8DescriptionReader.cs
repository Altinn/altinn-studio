using System;

namespace Altinn.Studio.Common.Domain.App.V8;

/// <summary>Reads a <see cref="V8Description"/>, whether or not the app turns out to be on v8.</summary>
public sealed class V8DescriptionReader : IAppSourceReader
{
    private AppFrontendVersion? _frontendVersion;

    /// <inheritdoc />
    public bool Accepts(AppFilePath path) => path.Is(AppFrontendVersionReader.IndexPath);

    /// <inheritdoc />
    public void Read(AppFilePath path, ReadOnlyMemory<byte> content) =>
        _frontendVersion = AppFrontendVersionReader.Read(content);

    /// <inheritdoc />
    public void Read(AppFilePath path, string content) => _frontendVersion = AppFrontendVersionReader.Read(content);

    /// <summary>Describes the app from the files read so far.</summary>
    public V8Description Build() => new(_frontendVersion);
}
