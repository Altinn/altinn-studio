using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.App;

public sealed class IndexPageGeneratorTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("IndexPageGenerator-");

    public void Dispose() => _appDir.Delete(recursive: true);

    private void WriteFile(string relativePath, string content)
    {
        string path = Path.Join(_appDir.FullName, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
    }

    private async Task<IndexPageGenerator> CreateGenerator()
    {
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        var appFiles = TestAppFiles.Load(_appDir.FullName);
        var frontendFeatures = new Mock<IFrontendFeatures>();
        frontendFeatures.Setup(f => f.GetDictionary()).Returns(new Dictionary<string, bool>());
        return new IndexPageGenerator(frontendFeatures.Object, appFiles);
    }

    [Fact]
    public async Task Custom_assets_and_frontend_assets_are_linked_from_the_app_files()
    {
        WriteFile(
            "config/assets.json",
            """
            {
                "stylesheets": [{ "url": "https://cdn.example.com/theme.css" }],
                "scripts": [{ "url": "https://cdn.example.com/lib.js", "defer": true }]
            }
            """
        );
        WriteFile("wwwroot/custom-css/b.css", "body {}");
        WriteFile("wwwroot/custom-css/a.css", "html {}");
        WriteFile("wwwroot/custom-js/x.js", "console.log(1)");
        var generator = await CreateGenerator();

        var globalState = new BootstrapGlobalResponse
        {
            ApplicationMetadata = new ApplicationMetadata("ttd/app"),
            Ui = new UiConfiguration { Folders = [] },
            AvailableLanguages = [],
            PlatformFrontendSettings = new PlatformFrontendSettings(),
        };

        var html = await generator.Generate("ttd", "app", globalState);

        Assert.Contains("href=\"https://cdn.example.com/theme.css\"", html);
        Assert.Contains("<script src=\"https://cdn.example.com/lib.js\" defer></script>", html);
        Assert.Contains("href=\"/ttd/app/custom-css/a.css\"", html);
        Assert.Contains("href=\"/ttd/app/custom-css/b.css\"", html);
        Assert.True(html.IndexOf("a.css", StringComparison.Ordinal) < html.IndexOf("b.css", StringComparison.Ordinal));
        Assert.Contains("<script src=\"/ttd/app/custom-js/x.js\"></script>", html);
        Assert.False(generator.HasLegacyIndexCshtml);
    }

    [Fact]
    public async Task Legacy_index_page_is_detected()
    {
        WriteFile("views/Home/Index.cshtml", "@page");
        var generator = await CreateGenerator();

        Assert.True(generator.HasLegacyIndexCshtml);
    }
}
