namespace Altinn.Studio.Preview.Tests;

/// <summary>
/// A repository root in a temporary directory, laid out as Designer lays out its working copies, and removed when
/// the test is done.
/// </summary>
internal sealed class RepositoryRoot : IDisposable
{
    public RepositoryRoot()
    {
        Path = Directory.CreateTempSubdirectory("preview-tests-").FullName;
    }

    public string Path { get; }

    /// <summary>Creates a working copy and returns its directory.</summary>
    public string AddWorkingCopy(string developer, string org, string app)
    {
        string directory = System.IO.Path.Combine(Path, developer, org, app);
        Directory.CreateDirectory(directory);
        return directory;
    }

    /// <summary>Writes a file below <paramref name="directory"/>, creating the directories on the way.</summary>
    public static string AddFile(string directory, string relativePath, string content)
    {
        string path = System.IO.Path.Combine(directory, relativePath);
        Directory.CreateDirectory(
            System.IO.Path.GetDirectoryName(path) ?? throw new ArgumentException("No directory.", nameof(relativePath))
        );
        File.WriteAllText(path, content);
        return path;
    }

    public void Dispose()
    {
        if (Directory.Exists(Path))
        {
            Directory.Delete(Path, recursive: true);
        }
    }
}
