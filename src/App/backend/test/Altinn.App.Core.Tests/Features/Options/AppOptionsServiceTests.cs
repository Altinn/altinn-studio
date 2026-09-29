using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Internal.App;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

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

    private static IInstanceDataAccessor DataAccessorFor(Instance instance)
    {
        var dataAccessor = new Mock<IInstanceDataAccessor>();
        dataAccessor.Setup(a => a.Instance).Returns(instance);
        return dataAccessor.Object;
    }

    private static Instance NewInstance() =>
        new()
        {
            Id = $"1337/{Guid.NewGuid()}",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
        };

    private static AppOptionsLookup Lookup(string optionId) => new(optionId, []);

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
    }

    [Fact]
    public async Task A_batch_returns_one_result_per_lookup_in_order_with_its_source()
    {
        WriteOptionsFile("land", """[{ "value": "NO", "label": "Norge" }]""");
        _services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        var service = CreateService();

        var results = await service.GetOptionsAsync(
            [Lookup("land"), Lookup("Country"), Lookup("missing")],
            LanguageConst.Nb,
            dataAccessor: null,
            CancellationToken.None
        );

        Assert.Collection(
            results,
            result =>
            {
                Assert.Equal("land", result.Lookup.OptionId);
                Assert.Equal(AppOptionsSource.File, result.Source);
                Assert.Equal(["NO"], result.AppOptions!.Options!.Select(o => o.Value));
            },
            result =>
            {
                Assert.Equal("Country", result.Lookup.OptionId);
                Assert.Equal(AppOptionsSource.AppProvider, result.Source);
                Assert.Equal(["47", "46"], result.AppOptions!.Options!.Select(o => o.Value));
            },
            result =>
            {
                Assert.Equal("missing", result.Lookup.OptionId);
                Assert.Equal(AppOptionsSource.None, result.Source);
                Assert.Null(result.AppOptions);
                Assert.Null(result.Error);
            }
        );
    }

    [Fact]
    public async Task Each_lookup_passes_its_own_key_value_pairs_to_the_provider()
    {
        _services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        var service = CreateService();

        var results = await service.GetOptionsAsync(
            [
                new AppOptionsLookup("country", new Dictionary<string, string> { ["key"] = "first" }),
                new AppOptionsLookup("country", new Dictionary<string, string> { ["key"] = "second" }),
            ],
            LanguageConst.Nb,
            dataAccessor: null,
            CancellationToken.None
        );

        Assert.Equal("first", results[0].AppOptions!.Parameters["key"]);
        Assert.Equal("second", results[1].AppOptions!.Parameters["key"]);
    }

    [Fact]
    public async Task An_instance_provider_is_reported_but_not_invoked_without_a_data_accessor()
    {
        var provider = new Mock<IInstanceAppOptionsProvider>(MockBehavior.Strict);
        provider.Setup(p => p.Id).Returns("vehicles");
        _services.AddSingleton(provider.Object);
        var service = CreateService();

        var results = await service.GetOptionsAsync(
            [Lookup("Vehicles")],
            LanguageConst.Nb,
            dataAccessor: null,
            CancellationToken.None
        );

        var result = Assert.Single(results);
        Assert.Equal(AppOptionsSource.InstanceProvider, result.Source);
        Assert.Null(result.AppOptions);
        Assert.Null(result.Error);
        provider.VerifyAll();
    }

    [Fact]
    public async Task An_instance_provider_wins_over_the_other_sources_when_the_batch_has_a_data_accessor()
    {
        WriteOptionsFile("vehicles", "[]");
        _services.AddSingleton<IAppOptionsProvider>(new NamedProvider("vehicles"));
        _services.AddSingleton<IInstanceAppOptionsProvider, VehiclesInstanceAppOptionsProvider>();
        var service = CreateService();
        var instance = NewInstance();

        var results = await service.GetOptionsAsync(
            [Lookup("vehicles")],
            LanguageConst.Nb,
            DataAccessorFor(instance),
            CancellationToken.None
        );

        var result = Assert.Single(results);
        Assert.Equal(AppOptionsSource.InstanceProvider, result.Source);
        Assert.Equal(3, result.AppOptions!.Options!.Count);
        Assert.Equal(instance.Id, VehiclesInstanceAppOptionsProvider.LastInstance?.ToString());
    }

    [Fact]
    public async Task A_provider_exception_is_captured_in_the_result_and_rethrown_by_the_single_id_overload()
    {
        var exception = new InvalidOperationException("The code list service is down");
        _services.AddSingleton<IAppOptionsProvider>(new NamedProvider("broken", exception));
        WriteOptionsFile("land", "[]");
        var service = CreateService();

        var results = await service.GetOptionsAsync(
            [Lookup("broken"), Lookup("land")],
            LanguageConst.Nb,
            dataAccessor: null,
            CancellationToken.None
        );

        Assert.Equal(AppOptionsSource.AppProvider, results[0].Source);
        Assert.Same(exception, results[0].Error);
        Assert.Null(results[0].AppOptions);
        // The other lookups in the batch are unaffected
        Assert.Equal(AppOptionsSource.File, results[1].Source);
        Assert.NotNull(results[1].AppOptions?.Options);

        var thrown = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.GetOptionsAsync("broken", LanguageConst.Nb, [])
        );
        Assert.Same(exception, thrown);
    }

    [Fact]
    public async Task A_cancelled_batch_throws_instead_of_reporting_errors()
    {
        using var cancellation = new CancellationTokenSource();
        // The provider observes the cancellation and throws, like an HttpClient call would
        _services.AddSingleton<IAppOptionsProvider>(
            new NamedProvider("slow", new OperationCanceledException(), onCall: cancellation.Cancel)
        );
        var service = CreateService();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            service.GetOptionsAsync([Lookup("slow")], LanguageConst.Nb, dataAccessor: null, cancellation.Token)
        );
    }

    [Fact]
    public async Task The_providers_are_resolved_once_per_batch()
    {
        var constructions = 0;
        _services.AddTransient<IAppOptionsProvider>(_ =>
        {
            constructions++;
            return new NamedProvider("counted");
        });
        var provider = new Mock<IAppOptionsProvider>(MockBehavior.Strict);
        provider.Setup(p => p.Id).Returns("mocked");
        _services.AddSingleton(provider.Object);
        var service = CreateService();

        await service.GetOptionsAsync(
            [Lookup("counted"), Lookup("counted"), Lookup("missing")],
            LanguageConst.Nb,
            dataAccessor: null,
            CancellationToken.None
        );

        Assert.Equal(1, constructions);
        provider.Verify(p => p.Id, Times.Once);
    }

    [Fact]
    public async Task A_library_reference_is_loaded_through_the_library_service()
    {
        var library = new FakeLibraryService();
        _services.AddSingleton<IAltinn3LibraryCodeListService>(library);
        var service = CreateService();

        var results = await service.GetOptionsAsync(
            [Lookup("lib**ttd**countries**2")],
            LanguageConst.Nb,
            dataAccessor: null,
            CancellationToken.None
        );

        var result = Assert.Single(results);
        Assert.Equal(AppOptionsSource.Library, result.Source);
        Assert.Equal(["lib"], result.AppOptions!.Options!.Select(o => o.Value));
        Assert.Equal([("ttd", "countries", "2", LanguageConst.Nb)], library.Calls);
    }

    [Fact]
    public async Task A_library_code_list_registered_under_an_id_is_loaded_through_the_library_service()
    {
        var library = new FakeLibraryService();
        _services.AddSingleton<IAltinn3LibraryCodeListService>(library);
#pragma warning disable CS0618 // The registration is obsolete, but still supported
        _services.AddAltinn3CodeList("countries", "ttd", "countries");
#pragma warning restore CS0618
        var service = CreateService();

        var appOptions = await service.GetOptionsAsync("Countries", LanguageConst.Nb, []);

        Assert.Equal(["lib"], appOptions.Options!.Select(o => o.Value));
        Assert.Equal([("ttd", "countries", "latest", LanguageConst.Nb)], library.Calls);
    }

    [Fact]
    public async Task A_provider_id_that_looks_like_a_library_reference_yields_to_the_library()
    {
        var library = new FakeLibraryService();
        _services.AddSingleton<IAltinn3LibraryCodeListService>(library);
        _services.AddSingleton<IAppOptionsProvider>(new NamedProvider("lib**ttd**countries**latest"));
        var service = CreateService();

        var results = await service.GetOptionsAsync(
            [Lookup("lib**ttd**countries**latest")],
            LanguageConst.Nb,
            dataAccessor: null,
            CancellationToken.None
        );

        Assert.Equal(AppOptionsSource.Library, Assert.Single(results).Source);
    }

    [Fact]
    public void The_registrations_list_every_source_in_the_order_they_are_tried()
    {
        WriteOptionsFile("land", "[]");
        WriteOptionsFile("country", "[]");
        _services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        _services.AddSingleton<IInstanceAppOptionsProvider, VehiclesInstanceAppOptionsProvider>();
        _services.AddJoinedAppOptions("everything", "land", "country");
#pragma warning disable CS0618 // The registration is obsolete, but still supported
        _services.AddAltinn3CodeList("fylker", "ttd", "counties", "3");
#pragma warning restore CS0618
        var service = CreateService();

        var registrations = service.GetRegistrations();

        Assert.Collection(
            registrations,
            registration =>
                Assert.Equal(
                    new InstanceProviderOptionsRegistration("vehicles", typeof(VehiclesInstanceAppOptionsProvider)),
                    registration
                ),
            registration =>
            {
                var joined = Assert.IsType<JoinedOptionsRegistration>(registration);
                Assert.Equal("everything", joined.OptionId);
                Assert.Equal(["land", "country"], joined.SubOptionIds);
            },
            registration =>
                Assert.Equal(new LibraryOptionsRegistration("fylker", "ttd", "counties", "3"), registration),
            registration =>
                Assert.Equal(
                    new ProviderOptionsRegistration("country", typeof(CountryAppOptionsProvider)),
                    registration
                ),
            // The file the provider shadows is listed too, after the provider
            registration => Assert.Equal(new FileOptionsRegistration("country"), registration),
            registration => Assert.Equal(new FileOptionsRegistration("land"), registration)
        );
    }

    private sealed class NamedProvider(string id, Exception? throws = null, System.Action? onCall = null)
        : IAppOptionsProvider
    {
        public string Id => id;

        public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
        {
            onCall?.Invoke();
            if (throws is not null)
            {
                throw throws;
            }

            return Task.FromResult(new AppOptions { Options = [new AppOption { Label = id, Value = id }] });
        }
    }

    private sealed class FakeLibraryService : IAltinn3LibraryCodeListService
    {
        public List<(string Org, string CodeListId, string Version, string? Language)> Calls { get; } = [];

        public Task<AppOptions> GetAppOptionsAsync(
            string org,
            string codeListId,
            string version,
            string? language,
            CancellationToken cancellationToken
        )
        {
            Calls.Add((org, codeListId, version, language));
            return Task.FromResult(
                new AppOptions { Options = [new AppOption { Label = "From the library", Value = "lib" }] }
            );
        }

        public Task<Altinn3LibraryCodeListResponse> GetCachedCodeListResponseAsync(
            string org,
            string codeListId,
            string? version,
            CancellationToken cancellationToken
        ) => throw new NotSupportedException();

        public AppOptions MapAppOptions(Altinn3LibraryCodeListResponse libraryCodeListResponse, string? language) =>
            throw new NotSupportedException();
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
        public static InstanceIdentifier? LastInstance { get; private set; }

        public string Id => "vehicles";

        public Task<AppOptions> GetInstanceAppOptionsAsync(
            InstanceIdentifier instanceIdentifier,
            string? language,
            Dictionary<string, string> keyValuePairs
        )
        {
            LastInstance = instanceIdentifier;
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
