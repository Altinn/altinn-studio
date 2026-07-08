namespace Altinn.Studio.AppConfig.Documents;

public interface IAppDirectory
{
    string Root { get; }
    bool Exists(string relativePath);
    bool DirectoryExists(string relativeDir);
    byte[]? ReadAllBytes(string relativePath);

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
