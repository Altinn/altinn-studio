using System.Text;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Internal.App;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Features.Options;

public class JoinedAppOptionsTests
{
    private readonly Mock<IAppOptionsProvider> _neverUsedOptionsProviderMock = new(MockBehavior.Strict);
    private readonly Mock<IAppOptionsProvider> _countryAppOptionsMock = new(MockBehavior.Strict);
    private readonly Mock<IAppOptionsProvider> _sentinelOptionsProviderMock = new(MockBehavior.Strict);
    private readonly ServiceCollection _serviceCollection = new();

    private readonly string _language = LanguageConst.Nb;
    private static readonly List<AppOption> _appOptionsCountries =
    [
        new AppOption { Value = "no", Label = "Norway" },
        new AppOption { Value = "se", Label = "Sweden" },
    ];

    private static readonly List<AppOption> _appOptionsSentinel = [new AppOption { Value = null, Label = "Sentinel" }];

    public JoinedAppOptionsTests()
    {
        _serviceCollection.AddAppImplementationFactory();
        _countryAppOptionsMock.Setup(p => p.Id).Returns("country-no-sentinel");
        _countryAppOptionsMock
            .Setup(p => p.GetAppOptionsAsync(_language, It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(
                (string language, Dictionary<string, string> keyValuePairs) =>
                    new AppOptions() { Options = _appOptionsCountries, Parameters = keyValuePairs.ToDictionary()! }
            );
        _serviceCollection.AddSingleton(_countryAppOptionsMock.Object);

        _sentinelOptionsProviderMock.Setup(p => p.Id).Returns("sentinel");
        _sentinelOptionsProviderMock
            .Setup(p => p.GetAppOptionsAsync(_language, It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(
                (string language, Dictionary<string, string> keyValuePairs) =>
                    new AppOptions() { Options = _appOptionsSentinel, Parameters = keyValuePairs.ToDictionary()! }
            );
        _serviceCollection.AddSingleton(_sentinelOptionsProviderMock.Object);

        // An app without any option files, so an id without a provider has no options
        _serviceCollection.AddSingleton(
            new AppFilesAccessor(new AppFiles(Encoding.UTF8.GetBytes(TestAppFiles.MinimalApplicationMetadata)))
        );

        // This provider should never be used and cause an error if it is
        _neverUsedOptionsProviderMock.Setup(p => p.Id).Returns("never-used");
        _serviceCollection.AddSingleton(_neverUsedOptionsProviderMock.Object);

        _serviceCollection.AddSingleton<IAppOptionsService, AppOptionsService>();
    }

    [Fact]
    public async Task JoinedOptions_AreResolvedByTheService_WithSourceJoined()
    {
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel", "sentinel");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();

        var results = await appOptionsService.GetOptionsAsync(
            [new AppOptionsLookup("Country", [])],
            _language,
            dataAccessor: null,
            CancellationToken.None
        );

        var result = Assert.Single(results);
        Assert.Equal(AppOptionsSource.Joined, result.Source);
        Assert.Null(result.Error);
        Assert.Equal(_appOptionsCountries.Concat(_appOptionsSentinel), result.AppOptions!.Options);
        // The joined list is not a provider the app can enumerate
        Assert.DoesNotContain(sp.GetServices<IAppOptionsProvider>(), p => p.Id == "country");

        _neverUsedOptionsProviderMock.VerifyAll();
        _countryAppOptionsMock.VerifyAll();
        _sentinelOptionsProviderMock.VerifyAll();
    }

    [Fact]
    public async Task JoinedOptions_AreCacheableOnlyWhenEverySubListIs()
    {
        _serviceCollection.AddSingleton<IAppOptionsProvider>(new StaticProvider("cacheable", isCacheable: true));
        _serviceCollection.AddSingleton<IAppOptionsProvider>(new StaticProvider("volatile", isCacheable: false));
        _serviceCollection.AddJoinedAppOptions("both", "cacheable", "volatile");
        _serviceCollection.AddJoinedAppOptions("only-cacheable", "cacheable");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();

        Assert.False((await appOptionsService.GetOptionsAsync("both", _language, new())).IsCacheable);
        Assert.True((await appOptionsService.GetOptionsAsync("only-cacheable", _language, new())).IsCacheable);
    }

    [Fact]
    public async Task JoinedOptions_NestedJoinedLists_AreExpanded()
    {
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel");
        _serviceCollection.AddJoinedAppOptions("all", "country", "sentinel");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();
        var parameters = new Dictionary<string, string> { { "key", "value" } };

        var options = await appOptionsService.GetOptionsAsync("all", _language, parameters);

        Assert.Equal(_appOptionsCountries.Concat(_appOptionsSentinel), options.Options);
        // The parameters are prefixed once per level
        Assert.Equal(
            new Dictionary<string, string?>
            {
                ["country_country-no-sentinel_key"] = "value",
                ["sentinel_key"] = "value",
            },
            options.Parameters
        );

        _neverUsedOptionsProviderMock.VerifyAll();
        _countryAppOptionsMock.VerifyAll();
        _sentinelOptionsProviderMock.VerifyAll();
    }

    [Fact]
    public async Task JoinedOptions_ThatIncludeThemselves_ReportAnErrorInsteadOfRecursing()
    {
        _serviceCollection.AddJoinedAppOptions("a", "sentinel", "b");
        _serviceCollection.AddJoinedAppOptions("b", "a");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();

        var results = await appOptionsService.GetOptionsAsync(
            [new AppOptionsLookup("a", [])],
            _language,
            dataAccessor: null,
            CancellationToken.None
        );

        var result = Assert.Single(results);
        Assert.Equal(AppOptionsSource.Joined, result.Source);
        Assert.Null(result.AppOptions);
        var error = Assert.IsType<InvalidOperationException>(result.Error);
        Assert.Contains("AddJoinedAppOptions", error.Message);
    }

    [Fact]
    public async Task JoinedOptions_CarryTheFirstSubListError()
    {
        var exception = new HttpRequestException("The code list service is down");
        _serviceCollection.AddSingleton<IAppOptionsProvider>(new StaticProvider("broken", throws: exception));
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel", "broken", "sentinel");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();

        var results = await appOptionsService.GetOptionsAsync(
            [new AppOptionsLookup("country", [])],
            _language,
            dataAccessor: null,
            CancellationToken.None
        );

        var result = Assert.Single(results);
        Assert.Equal(AppOptionsSource.Joined, result.Source);
        Assert.Same(exception, result.Error);
        // The single id overload throws the same exception
        var thrown = await Assert.ThrowsAsync<HttpRequestException>(() =>
            appOptionsService.GetOptionsAsync("country", _language, new())
        );
        Assert.Same(exception, thrown);
    }

    [Fact]
    public async Task JoinedOptionPovider_UseAppOptionsServiceWithBothProviders()
    {
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel", "sentinel");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();

        var options = await appOptionsService.GetOptionsAsync("country", _language, new());

        options.Options.Should().BeEquivalentTo(_appOptionsCountries.Concat(_appOptionsSentinel));

        _neverUsedOptionsProviderMock.VerifyAll();
        _countryAppOptionsMock.VerifyAll();
        _sentinelOptionsProviderMock.VerifyAll();
    }

    [Fact]
    public async Task JoinSingleList()
    {
        // Test the edge case where only a single list is joined
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();

        // Fetch the country options (now without sentinel)
        var options = await appOptionsService.GetOptionsAsync("country", _language, new());
        options.Options.Should().BeEquivalentTo(_appOptionsCountries);

        // Fetch sentinel options to make verifications work
        var sentinelOptions = await appOptionsService.GetOptionsAsync("sentinel", _language, new());
        sentinelOptions.Options.Should().BeEquivalentTo(_appOptionsSentinel);

        _neverUsedOptionsProviderMock.VerifyAll();
        _countryAppOptionsMock.VerifyAll();
        _sentinelOptionsProviderMock.VerifyAll();
    }

    [Fact]
    public async Task JoinLists_VerifyParameters()
    {
        // Test the edge case where only a single list is joined
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel", "sentinel");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();

        var parameters = new Dictionary<string, string> { { "key", "value" } };

        var options = await appOptionsService.GetOptionsAsync("country", _language, parameters);

        options
            .Parameters.Should()
            .BeEquivalentTo(
                new Dictionary<string, string> { { "country-no-sentinel_key", "value" }, { "sentinel_key", "value" } }
            );

        _neverUsedOptionsProviderMock.VerifyAll();
        _countryAppOptionsMock.VerifyAll();
        _sentinelOptionsProviderMock.VerifyAll();
    }

    [Fact]
    public async Task JoinWithMissingProvider_ThrowsExceptionToWarnAboutMissconfiguration()
    {
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel", "missing");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<IAppOptionsService>();

        var action = new Func<Task>(async () => await appOptionsService.GetOptionsAsync("country", _language, new()));
        var exception = await action.Should().ThrowAsync<KeyNotFoundException>();
        exception.WithMessage("missing is not registered as an app option");

        _neverUsedOptionsProviderMock.VerifyAll();
        _countryAppOptionsMock.VerifyAll();
    }

    private sealed class StaticProvider(string id, bool isCacheable = false, Exception? throws = null)
        : IAppOptionsProvider
    {
        public string Id => id;

        public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
        {
            if (throws is not null)
            {
                throw throws;
            }

            return Task.FromResult(
                new AppOptions { Options = [new AppOption { Value = id, Label = id }], IsCacheable = isCacheable }
            );
        }
    }
}
