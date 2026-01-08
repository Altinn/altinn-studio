using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Features.Options.Altinn3LibraryProvider;
using Altinn.App.Core.Internal.Language;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Tests.Features.Options.Altinn3LibraryProvider;

public class Altinn3LibraryOptionsProviderTests
{
    private const string ClientName = "Altinn3LibraryClient";
    private const string OptionId = "SomeId";
    private const string Org = "ttd";
    private const string CodeListId = "SomeCodeListId";
    private const string Version = "1";
    private const string ExpectedUri = $"{Org}/code_lists/{CodeListId}/{Version}.json";

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_RequestingEnThenNb_ShouldReturnNbOptionsOnSecondCall()
    {
        // Arrange
        await using var fixture = Fixture.Create(Altinn3LibraryOptionsProviderTestData.GetNbEnResponseMessage());

        // Act
        var optionsProvider = fixture.GetOptionsProvider(OptionId);
        await optionsProvider.GetAppOptionsAsync(LanguageConst.En, new Dictionary<string, string>());
        var result = await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal("tekst", option.Label);
        Assert.Equal("Dette er en tekst", option.Description);
        Assert.Equal("Velg dette valget for å få en tekst", option.HelpText);
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_LanguageCollectionsIsEmpty_ShouldReturnOptionsWithOnlyValueAndTags()
    {
        // Arrange
        var responseMessage = Altinn3LibraryOptionsProviderTestData.GetResponseMessage(
            new Dictionary<string, string>(),
            new Dictionary<string, string>(),
            new Dictionary<string, string>()
        );

        await using var fixture = Fixture.Create(responseMessage);

        // Act
        var optionsProvider = fixture.GetOptionsProvider(OptionId);
        var result = await optionsProvider.GetAppOptionsAsync(null, new Dictionary<string, string>());

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Empty(option.Label);
        Assert.NotNull(option.Description);
        Assert.Empty(option.Description);
        Assert.NotNull(option.HelpText);
        Assert.Empty(option.HelpText);
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_LanguageCollectionsIsNull_ShouldReturnOptionsWithOnlyValueAndTags()
    {
        // Arrange
        var responseMessage = Altinn3LibraryOptionsProviderTestData.GetResponseMessage(null, null, null);

        await using var fixture = Fixture.Create(responseMessage);

        // Act
        var optionsProvider = fixture.GetOptionsProvider(OptionId);
        var result = await optionsProvider.GetAppOptionsAsync(null, new Dictionary<string, string>());

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Null(option.Label);
        Assert.Null(option.Description);
        Assert.Null(option.HelpText);
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_NoLanguageProvided_ShouldSortAndUseFirstLanguageInDictionaryWhenNeitherNbNorEnExists()
    {
        // Arrange
        var labels = new Dictionary<string, string> { { "de", "text" }, { "se", "text" } };
        var descriptions = new Dictionary<string, string>
        {
            { "de", "Das ist ein Text" },
            { "se", "Det här är en text" },
        };
        var helpTexts = new Dictionary<string, string>
        {
            { "se", "Välj det här alternativet för att få ett text" },
            { "de", "Wählen Sie diese Option, um eine Text zu erhalten" },
        };
        var responseMessage = Altinn3LibraryOptionsProviderTestData.GetResponseMessage(labels, descriptions, helpTexts);

        await using var fixture = Fixture.Create(responseMessage);

        // Act
        var optionsProvider = fixture.GetOptionsProvider(OptionId);
        var result = await optionsProvider.GetAppOptionsAsync(null, new Dictionary<string, string>());

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal("text", option.Label);
        Assert.Equal("Das ist ein Text", option.Description);
        Assert.Equal("Wählen Sie diese Option, um eine Text zu erhalten", option.HelpText);
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_NoLanguageProvided_ShouldDefaultToEnWhenNbIsNotPresentInResponseButEnIs()
    {
        // Arrange
        var labels = new Dictionary<string, string> { { "de", "text" }, { "en", "text" } };
        var descriptions = new Dictionary<string, string> { { "de", "Das ist ein Text" }, { "en", "This is a text" } };
        var helpTexts = new Dictionary<string, string>
        {
            { "en", "Choose this option to get a text" },
            { "de", "Wählen Sie diese Option, um eine Text zu erhalten" },
        };
        var responseMessage = Altinn3LibraryOptionsProviderTestData.GetResponseMessage(labels, descriptions, helpTexts);

        await using var fixture = Fixture.Create(responseMessage);

        // Act
        var optionsProvider = fixture.GetOptionsProvider(OptionId);
        var result = await optionsProvider.GetAppOptionsAsync(null, new Dictionary<string, string>());

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal("text", option.Label);
        Assert.Equal("This is a text", option.Description);
        Assert.Equal("Choose this option to get a text", option.HelpText);
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_NoLanguageProvided_ShouldDefaultToNbWhenNbIsPresentInResponse()
    {
        // Arrange
        await using var fixture = Fixture.Create(Altinn3LibraryOptionsProviderTestData.GetNbEnResponseMessage());

        // Act
        var optionsProvider = fixture.GetOptionsProvider(OptionId);
        var result = await optionsProvider.GetAppOptionsAsync(null, new Dictionary<string, string>());

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal("tekst", option.Label);
        Assert.Equal("Dette er en tekst", option.Description);
        Assert.Equal("Velg dette valget for å få en tekst", option.HelpText);
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_TwoCallsRequestingTheSameHybridCacheKey_ShouldCallMessageHandlerOnce()
    {
        // Arrange
        await using var fixture = Fixture.Create(Altinn3LibraryOptionsProviderTestData.GetNbEnResponseMessage());

        var platformSettings = fixture.ServiceProvider.GetService<IOptions<PlatformSettings>>()?.Value!;

        // Act
        var optionsProvider = fixture.GetOptionsProvider(OptionId);
        await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());
        await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());

        // Assert
        Assert.Equal(platformSettings.Altinn3LibraryApiEndpoint + ExpectedUri, fixture.MockHandler.LastRequestUri);
        Assert.Equal(1, fixture.MockHandler.CallCount);
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_ThrowsHttpRequestException_ShouldLogErrorAndThrow()
    {
        // Arrange
        var fakeLogger = new FakeLogger<Altinn3LibraryOptionsProvider>();
        await using var fixture = Fixture.Create(
            () => new HttpResponseMessage(HttpStatusCode.Conflict) { Content = new StringContent("Conflict") },
            services => services.AddSingleton<ILogger<Altinn3LibraryOptionsProvider>>(fakeLogger)
        );

        // Act
        var result = await Assert.ThrowsAsync<HttpRequestException>(() =>
            fixture.GetOptionsProvider(OptionId).GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>())
        );

        // Assert
        var latestRecord = fakeLogger.LatestRecord;
        Assert.NotNull(latestRecord);
        Assert.Equal(LogLevel.Error, latestRecord.Level);
        Assert.Equal(
            $"Exception thrown in GetAppOptions. Code list id: {CodeListId}, Version: {Version}, Org: {Org}",
            latestRecord.Message
        );
        Assert.Equal("Unexpected response from Altinn3Library", result.Message);
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_OnSuccess_ShouldReturnsOptions()
    {
        // Arrange
        await using var fixture = Fixture.Create(Altinn3LibraryOptionsProviderTestData.GetNbEnResponseMessage());

        var platformSettings = fixture.ServiceProvider.GetService<IOptions<PlatformSettings>>()?.Value!;

        // Act
        var optionsProvider = fixture.GetOptionsProvider(OptionId);
        var result = await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsCacheable);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal("value1", option.Value);
        Assert.Equal("tekst", option.Label);
        Assert.Equal("Dette er en tekst", option.Description);
        Assert.Equal("Velg dette valget for å få en tekst", option.HelpText);
        var versionParam = result.Parameters.Single(p => p.Key == "version");
        Assert.Equal("ttd/code_lists/someNewCodeList/1.json", versionParam.Value);
        var sourceParam = result.Parameters.Single(p => p.Key == "source");
        Assert.Equal("test-data-files", sourceParam.Value);
        Assert.Equal(platformSettings.Altinn3LibraryApiEndpoint + ExpectedUri, fixture.MockHandler.LastRequestUri);
        Assert.Equal(1, fixture.MockHandler.CallCount);
    }

    private sealed record Fixture(ServiceProvider ServiceProvider) : IAsyncDisposable
    {
        public required Altinn3LibraryOptionsProviderMessageHandlerMock MockHandler { get; init; }

        public IAppOptionsProvider GetOptionsProvider(string id) =>
            ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>().Single(p => p.Id == id);

        public static Fixture Create(
            Func<HttpResponseMessage> responseMessage,
            Action<IServiceCollection>? configure = null
        )
        {
            var mockHandler = new Altinn3LibraryOptionsProviderMessageHandlerMock(responseMessage);
            var serviceCollection = new ServiceCollection();
            serviceCollection.AddHttpClient(ClientName).ConfigurePrimaryHttpMessageHandler(() => mockHandler);
            serviceCollection.AddHybridCache();
            serviceCollection.AddAltinn3CodeList(
                optionId: OptionId,
                org: Org,
                codeListId: CodeListId,
                version: Version
            );
            configure?.Invoke(serviceCollection);

            return new Fixture(serviceCollection.BuildServiceProvider()) { MockHandler = mockHandler };
        }

        public async ValueTask DisposeAsync() => await ServiceProvider.DisposeAsync();
    }
}
