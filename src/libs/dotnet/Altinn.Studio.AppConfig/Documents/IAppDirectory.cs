namespace Altinn.Studio.AppConfig.Documents;

public interface IAppDirectory
{
    string Root { get; }
    bool Exists(string relativePath);
    bool DirectoryExists(string relativeDir);
    byte[]? ReadAllBytes(string relativePath);

    /// <summary>
    /// Reads a file addressed relative to <see cref="Root"/> that may live outside the app root,
    /// e.g. <c>../Directory.Packages.props</c> for a parent MSBuild import. Null when the file is
    /// missing or the directory has no surrounding filesystem.
    /// </summary>
    byte[]? ReadExternalBytes(string relativePath);

    IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive);
}

internal interface IHashingAppDirectory : IAppDirectory
{
    FileHandle ReadHandle(string relativePath);
}

public interface IWritableAppDirectory : IAppDirectory
{
    void WriteAllBytes(string relativePath, byte[] bytes);

    byte[]? ReadRawBytes(string relativePath);

    void Delete(string relativePath);

    void Rename(string oldRelativePath, string newRelativePath);
}
