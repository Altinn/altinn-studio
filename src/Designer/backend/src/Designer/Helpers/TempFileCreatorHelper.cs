#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Helpers;

public sealed class TempFileCreatorHelper : IDisposable
{
    private bool _disposed;
    private readonly string _directoryName;

    public TempFileCreatorHelper()
    {
        _directoryName = Guid.NewGuid().ToString().Substring(0, 16);
    }

    public async Task CreateFileOnPath(string relativeDirectory, string fileName, string contents)
    {
        ThrowIfDisposed();
        string combinedPath = Path.Join(_directoryName, relativeDirectory);
        string? directory = Path.GetDirectoryName(combinedPath);
        if (string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(combinedPath);
        }

        string absolutePath = Path.Join(directory, combinedPath, fileName);

        await File.WriteAllTextAsync(absolutePath, contents);
    }

    public List<string> GetAllFilePaths()
    {
        return [.. Directory.GetFiles(_directoryName, "*", SearchOption.AllDirectories).Select(f => f.ToString().Replace(_directoryName, ""))];
    }

    public void Dispose()
    {
        if (string.IsNullOrEmpty(_directoryName) is false)
        {
            Directory.Delete(_directoryName, true);
        }

        _disposed = true;
    }

    private void ThrowIfDisposed()
    {
        ObjectDisposedException.ThrowIf(_disposed, "TempFileCreatorHelper has been disposed");
    }
}
