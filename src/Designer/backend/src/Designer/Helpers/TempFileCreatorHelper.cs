#nullable enable
using System;
using System.IO;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Helpers;

public class TempFileCreatorHelper : IDisposable
{
    private bool _disposed;
    private string _directoryName = string.Empty;

    public async Task CreateFileOnPath(string relativeDirectory, string fileName, string contents)
    {
        ThrowIfDisposed();
        string? directory = Path.GetDirectoryName(relativeDirectory);
        if (string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(relativeDirectory);
        }

        string absolutePath = Path.Join(directory, relativeDirectory, fileName);

        await File.WriteAllTextAsync(absolutePath, contents);
        _directoryName = relativeDirectory;
    }

    public void Dispose()
    {
        if (string.IsNullOrEmpty(_directoryName) is false)
        {
            Directory.Delete(_directoryName, true);
        }

        GC.SuppressFinalize(this);
        _disposed = true;
    }

    private void ThrowIfDisposed()
    {
        ObjectDisposedException.ThrowIf(_disposed, "TempFileCreatorHelper has been disposed");
    }
}
