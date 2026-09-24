using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Tests.Internal.App;

namespace Altinn.App.Core.Tests.Features.Options;

public sealed class AppOptionsFileHandlerTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppOptionsFileHandler-");

    public void Dispose() => _appDir.Delete(recursive: true);

    private async Task<AppOptionsFileHandler> CreateHandler()
    {
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        var appFiles = await TestAppFiles.Load(_appDir.FullName);
        return new AppOptionsFileHandler(appFiles);
    }

    private void WriteOptions(string optionId, string content)
    {
        string path = Path.Join(_appDir.FullName, "options", $"{optionId}.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
    }

    [Fact]
    public async Task Reads_the_option_list_from_the_app_files()
    {
        WriteOptions(
            "land",
            """
            [
                // comments and trailing commas are accepted
                { "value": "NO", "label": "Norge", "description": "Landet", "helpText": "Hjelp" },
                { "value": "SE", "label": "Sverige" },
            ]
            """
        );
        var handler = await CreateHandler();

        var options = await handler.ReadOptionsFromFileAsync("land");

        Assert.NotNull(options);
        Assert.Collection(
            options,
            option =>
            {
                Assert.Equal("NO", option.Value);
                Assert.Equal("Norge", option.Label);
                Assert.Equal("Landet", option.Description);
                Assert.Equal("Hjelp", option.HelpText);
            },
            option =>
            {
                Assert.Equal("SE", option.Value);
                Assert.Equal("Sverige", option.Label);
            }
        );
    }

    [Fact]
    public async Task Returns_null_when_the_option_list_does_not_exist()
    {
        var handler = await CreateHandler();

        Assert.Null(await handler.ReadOptionsFromFileAsync("missing"));
    }

    [Fact]
    public async Task Option_ids_are_looked_up_by_name_and_cannot_leave_the_options_folder()
    {
        WriteOptions("land", "[]");
        var handler = await CreateHandler();

        Assert.Null(await handler.ReadOptionsFromFileAsync("../options/land"));
        Assert.Null(await handler.ReadOptionsFromFileAsync("../config/applicationmetadata"));
    }
}
