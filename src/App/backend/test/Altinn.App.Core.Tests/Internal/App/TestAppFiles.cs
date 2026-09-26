using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Tests.Internal.App;

/// <summary>
/// Loads the app files in a test folder the way the app does at startup.
/// </summary>
internal static class TestAppFiles
{
    public const string MinimalApplicationMetadata = """{ "id": "ttd/app" }""";

    public static AppFilesAccessor Load(string appDir) => new(AppFilesLoader.Load(appDir));

    /// <summary>
    /// Writes the application metadata file the loader requires, for tests that are about other files.
    /// </summary>
    public static void WriteMinimalApplicationMetadata(string appDir)
    {
        string path = Path.Join(appDir, "config", "applicationmetadata.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, MinimalApplicationMetadata);
    }
}
