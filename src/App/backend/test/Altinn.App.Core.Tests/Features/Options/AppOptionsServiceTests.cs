using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Internal.App;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Features.Options;

public sealed class AppOptionsServiceTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppOptionsService-");
    private readonly ServiceCollection _services = new();
    private ServiceProvider? _serviceProvider;

    public AppOptionsServiceTests()
    {
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        _services.AddAppImplementationFactory();
        _services.AddSingleton<AppOptionsService>();
    }

    public void Dispose()
    {
        _serviceProvider?.Dispose();
        _appDir.Delete(recursive: true);
    }

    private AppOptionsService CreateService()
    {
        _services.AddSingleton(TestAppFiles.Load(_appDir.FullName));
        _serviceProvider = _services.BuildStrictServiceProvider();
        return _serviceProvider.GetRequiredService<AppOptionsService>();
    }

    private void WriteOptionsFile(string optionId, string content)
    {
        string path = Path.Join(_appDir.FullName, "options", $"{optionId}.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
    }

    [Fact]
    public async Task Options_without_a_provider_come_from_the_app_files()
    {
        WriteOptionsFile(
            "land",
            """
            [
                // comments and trailing commas are accepted
                { "value": "NO", "label": "Norge", "description": "Landet", "helpText": "Hjelp" },
                { "value": "SE", "label": "Sverige" },
            ]
            """
        );
        var service = CreateService();

        var appOptions = await service.GetOptionsAsync("land", LanguageConst.Nb, []);

        Assert.NotNull(appOptions.Options);
        Assert.Collection(
            appOptions.Options,
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
        Assert.Empty(appOptions.Parameters);
    }

    [Fact]
    public async Task Options_are_null_when_the_app_has_neither_a_provider_nor_a_file()
    {
        var service = CreateService();

        var appOptions = await service.GetOptionsAsync("missing", LanguageConst.Nb, []);

        Assert.Null(appOptions.Options);
    }

    [Fact]
    public async Task Option_ids_are_looked_up_by_name_and_cannot_leave_the_options_folder()
    {
        WriteOptionsFile("land", "[]");
        var service = CreateService();

        Assert.NotNull((await service.GetOptionsAsync("land", LanguageConst.Nb, [])).Options);
        Assert.Null((await service.GetOptionsAsync("../options/land", LanguageConst.Nb, [])).Options);
        Assert.Null((await service.GetOptionsAsync("../config/applicationmetadata", LanguageConst.Nb, [])).Options);
    }

    [Fact]
    public async Task A_registered_provider_is_matched_by_id_regardless_of_case()
    {
        _services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        var service = CreateService();
        var keyValuePairs = new Dictionary<string, string> { ["key"] = "value" };

        var appOptions = await service.GetOptionsAsync("Country", LanguageConst.Nb, keyValuePairs);

        Assert.Equal(["47", "46"], appOptions.Options!.Select(o => o.Value));
        Assert.Equal("value", appOptions.Parameters["key"]);
    }

    [Fact]
    public async Task A_registered_provider_wins_over_a_file_with_the_same_id()
    {
        WriteOptionsFile("country", """[{ "value": "file", "label": "From file" }]""");
        _services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        var service = CreateService();

        var appOptions = await service.GetOptionsAsync("country", LanguageConst.Nb, []);

        Assert.Equal(["47", "46"], appOptions.Options!.Select(o => o.Value));
    }

    [Fact]
    public async Task Instance_options_come_from_the_registered_instance_provider()
    {
        _services.AddSingleton<IInstanceAppOptionsProvider, VehiclesInstanceAppOptionsProvider>();
        var service = CreateService();
        var instance = new InstanceIdentifier(1337, Guid.NewGuid());

        var appOptions = await service.GetOptionsAsync(instance, "Vehicles", LanguageConst.Nb, []);

        Assert.NotNull(appOptions);
        Assert.Equal(3, appOptions.Options!.Count);
        Assert.True(service.IsInstanceAppOptionsProviderRegistered("vehicles"));
    }

    [Fact]
    public async Task Instance_options_are_null_without_an_instance_provider()
    {
        WriteOptionsFile("land", "[]");
        _services.AddSingleton<IInstanceAppOptionsProvider, VehiclesInstanceAppOptionsProvider>();
        var service = CreateService();
        var instance = new InstanceIdentifier(1337, Guid.NewGuid());

        // Neither a file nor a plain provider counts as an instance provider
        Assert.Null(await service.GetOptionsAsync(instance, "land", LanguageConst.Nb, []));
        Assert.Null(await service.GetOptionsAsync(instance, "not-vehicles", LanguageConst.Nb, []));
        Assert.False(service.IsInstanceAppOptionsProviderRegistered("land"));
    }

    [Fact]
    public void A_list_is_static_when_it_comes_from_a_file_that_no_provider_overrides()
    {
        WriteOptionsFile("land", "[]");
        WriteOptionsFile("country", "[]");
        _services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        var service = CreateService();

        Assert.True(service.IsStatic("land"));
        Assert.False(service.IsStatic("missing"));
        // The provider wins over the file, and a provider may use the key/value pairs
        Assert.False(service.IsStatic("country"));
        Assert.False(service.IsStatic("Country"));
    }

    private sealed class CountryAppOptionsProvider : IAppOptionsProvider
    {
        public string Id => "country";

        public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
        {
            var options = new AppOptions
            {
                Options =
                [
                    new AppOption { Label = "Norge", Value = "47" },
                    new AppOption { Label = "Sverige", Value = "46" },
                ],
                Parameters = keyValuePairs.ToDictionary(p => p.Key, string? (p) => p.Value),
            };

            return Task.FromResult(options);
        }
    }

    private sealed class VehiclesInstanceAppOptionsProvider : IInstanceAppOptionsProvider
    {
        public string Id => "vehicles";

        public Task<AppOptions> GetInstanceAppOptionsAsync(
            InstanceIdentifier instanceIdentifier,
            string? language,
            Dictionary<string, string> keyValuePairs
        )
        {
            var options = new AppOptions
            {
                Options =
                [
                    new AppOption { Label = "Skoda Octavia 1.6", Value = "DN49525" },
                    new AppOption { Label = "e-Golf", Value = "EK38470" },
                    new AppOption { Label = "Tilhenger", Value = "JT5817" },
                ],
            };

            return Task.FromResult(options);
        }
    }
}
