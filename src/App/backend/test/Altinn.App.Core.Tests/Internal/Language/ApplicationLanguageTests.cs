using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Tests.Internal.App;

namespace Altinn.App.Core.Tests.Internal.Language;

public sealed class ApplicationLanguageTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("ApplicationLanguage-");

    public void Dispose() => _appDir.Delete(recursive: true);

    private void WriteFile(string relativePath, string content)
    {
        string path = Path.Join(_appDir.FullName, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
    }

    [Fact]
    public async Task Languages_come_from_the_text_resource_files()
    {
        WriteFile("config/texts/resource.nb.json", """{ "language": "nb", "resources": [] }""");
        WriteFile("config/texts/resource.en.json", """{ "language": "en", "resources": [] }""");
        WriteFile("config/texts/resource.en-GB.json", """{ "language": "en-GB", "resources": [] }""");
        WriteFile("config/texts/notes.json", """{ "language": "ignored" }""");
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        var appFiles = await TestAppFiles.Load(_appDir.FullName);

        var languages = await new ApplicationLanguage(appFiles).GetApplicationLanguages();

        Assert.Equal(["en", "nb"], languages.Select(l => l.Language));
    }

    [Fact]
    public async Task No_text_resources_gives_no_languages()
    {
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        var appFiles = await TestAppFiles.Load(_appDir.FullName);

        Assert.Empty(await new ApplicationLanguage(appFiles).GetApplicationLanguages());
    }
}
