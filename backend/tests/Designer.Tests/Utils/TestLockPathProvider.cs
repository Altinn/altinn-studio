using System;
using System.IO;
using System.Threading;

namespace Designer.Tests.Utils;

public sealed class TestLockPathProvider
{
    private static readonly Lazy<TestLockPathProvider> _instance = new(() => new TestLockPathProvider(), LazyThreadSafetyMode.ExecutionAndPublication);

    public static TestLockPathProvider Instance => _instance.Value;

    public DirectoryInfo LockFileDirectory { get; }

    private TestLockPathProvider()
    {
        string path = Path.Combine(Path.GetTempPath(), "altinn", "distributedlocks");
        LockFileDirectory = new DirectoryInfo(path);
        if (!LockFileDirectory.Exists)
        {
            LockFileDirectory.Create();
        }
    }

}
