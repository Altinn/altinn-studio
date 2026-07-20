namespace Altinn.Studio.AppConfig.Documents;

internal readonly record struct FileHandle(string Path, byte[]? Bytes, long Hash)
{
    public static FileHandle Read(IAppDirectory dir, string path)
    {
        if (dir is IHashingAppDirectory hashing)
            return hashing.ReadHandle(path);
        var bytes = dir.ReadAllBytes(path);
        return new FileHandle(path, bytes, HashOf(bytes));
    }

    public static long HashOf(byte[]? data)
    {
        if (data is null)
            return 0;
        unchecked
        {
            ulong h = 1469598103934665603UL;
            foreach (var b in data)
            {
                h ^= b;
                h *= 1099511628211UL;
            }
            return (long)(h | 1UL);
        }
    }
}
