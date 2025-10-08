using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Features.Options;

public class JoinedAppOptionsTests
{
    private readonly Mock<IAppOptionsProvider> _neverUsedOptionsProviderMock = new(MockBehavior.Strict);
    private readonly Mock<IAppOptionsProvider> _countryAppOptionsMock = new(MockBehavior.Strict);
    private readonly Mock<IAppOptionsProvider> _sentinelOptionsProviderMock = new(MockBehavior.Strict);
    private readonly Mock<IAppOptionsFileHandler> _fileHandlerMock = new(MockBehavior.Strict);
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

        // Registrer a mocked default handler
        _serviceCollection.AddSingleton(_fileHandlerMock.Object);
        _serviceCollection.AddSingleton<IAppOptionsProvider, DefaultAppOptionsProvider>();

        // This provider should never be used and cause an error if it is
        _neverUsedOptionsProviderMock.Setup(p => p.Id).Returns("never-used");
        _serviceCollection.AddSingleton(_neverUsedOptionsProviderMock.Object);

        _serviceCollection.AddSingleton<AppOptionsFactory>();
        _serviceCollection.AddSingleton<InstanceAppOptionsFactory>();
        _serviceCollection.AddSingleton<AppOptionsService>();
    }

    [Fact]
    public async Task JoinedOptionsProvider_ReturnsOptionsFromBothProviders()
    {
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel", "sentinel");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var factory = sp.GetRequiredService<AppOptionsFactory>();
        IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("country");

        optionsProvider.Should().BeOfType<JoinedAppOptionsProvider>();
        optionsProvider.Id.Should().Be("country");
        var appOptions = await optionsProvider.GetAppOptionsAsync(_language, new Dictionary<string, string>());
        appOptions.Options.Should().HaveCount(3);
        appOptions.Options.Should().BeEquivalentTo(_appOptionsCountries.Concat(_appOptionsSentinel));

        _neverUsedOptionsProviderMock.VerifyAll();
        _countryAppOptionsMock.VerifyAll();
        _sentinelOptionsProviderMock.VerifyAll();
    }

    [Fact]
    public async Task JoinedOptionPovider_UseAppOptionsServiceWithBothProviders()
    {
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel", "sentinel");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<AppOptionsService>();

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
        var appOptionsService = sp.GetRequiredService<AppOptionsService>();

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
        var appOptionsService = sp.GetRequiredService<AppOptionsService>();

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
        _fileHandlerMock.Setup(p => p.ReadOptionsFromFileAsync("missing")).ReturnsAsync((List<AppOption>)null!);
        _serviceCollection.AddJoinedAppOptions("country", "country-no-sentinel", "missing");

        using var sp = _serviceCollection.BuildStrictServiceProvider();
        var appOptionsService = sp.GetRequiredService<AppOptionsService>();

        var action = new Func<Task>(async () => await appOptionsService.GetOptionsAsync("country", _language, new()));
        var exception = await action.Should().ThrowAsync<KeyNotFoundException>();
        exception.WithMessage("missing is not registrered as an app option");

        _neverUsedOptionsProviderMock.VerifyAll();
        _countryAppOptionsMock.VerifyAll();
    }
}
