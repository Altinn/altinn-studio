using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;
using Altinn.App.Core.Internal.Language;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Tests.Features.Options.Altinn3LibraryProvider;

public class Altinn3LibraryCodeListServiceTests
{
    private const string Org = "ttd";
    private const string CodeListId = "SomeCodeListId";
    private const string Version = "1";
    private const string ExpectedUri = $"{Org}/code_lists/{CodeListId}/{Version}.json";

    [Fact]
    public async Task GetCachedCodeListResponseAsync_TwoCallsRequestingDifferentHybridCacheKeys_ShouldCallMessageHandlerTwice()
    {
        // Arrange
        const string codeListIdTwo = "SomeOtherCodeListId";
        const string expectedUriTwo = $"{Org}/code_lists/{codeListIdTwo}/{Version}.json";

        await using var fixture = Fixture.Create();
        var serviceProvider = fixture.ServiceProvider;
        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;

        // Act/Assert: First scope
        using (var scope = serviceProvider.CreateScope())
        {
            var altinn3LibraryCodeListService =
                scope.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
            await altinn3LibraryCodeListService.GetCachedCodeListResponseAsync(
                Org,
                CodeListId,
                Version,
                CancellationToken.None
            );

            Assert.Equal(1, fixture.MockHandler.CallCount);
            Assert.Equal(platformSettings.Altinn3LibraryApiEndpoint + ExpectedUri, fixture.MockHandler.LastRequestUri);
        }

        // Second scope
        using (var scope = serviceProvider.CreateScope())
        {
            var altinn3LibraryCodeListService =
                scope.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
            await altinn3LibraryCodeListService.GetCachedCodeListResponseAsync(
                Org,
                codeListIdTwo,
                Version,
                CancellationToken.None
            );

            Assert.Equal(2, fixture.MockHandler.CallCount);
            Assert.Equal(
                platformSettings.Altinn3LibraryApiEndpoint + expectedUriTwo,
                fixture.MockHandler.LastRequestUri
            );
        }
    }

    [Fact]
    public async Task GetCachedCodeListResponseAsync_RequestsWithTheSameParametersTwice_ShouldCallMessageHandlerOnce()
    {
        // Arrange
        await using var fixture = Fixture.Create();
        var serviceProvider = fixture.ServiceProvider;
        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;

        // Act/Assert: First scope
        using (var scope = serviceProvider.CreateScope())
        {
            var altinn3LibraryCodeListService =
                scope.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
            await altinn3LibraryCodeListService.GetCachedCodeListResponseAsync(
                Org,
                CodeListId,
                Version,
                CancellationToken.None
            );

            Assert.Equal(1, fixture.MockHandler.CallCount);
            Assert.Equal(platformSettings.Altinn3LibraryApiEndpoint + ExpectedUri, fixture.MockHandler.LastRequestUri);
        }

        // Second scope - should use cache
        using (var scope = serviceProvider.CreateScope())
        {
            var optionsProvider = scope.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
            await optionsProvider.GetCachedCodeListResponseAsync(Org, CodeListId, Version, CancellationToken.None);

            // Still only 1 call because of caching
            Assert.Equal(1, fixture.MockHandler.CallCount);
            Assert.Equal(platformSettings.Altinn3LibraryApiEndpoint + ExpectedUri, fixture.MockHandler.LastRequestUri);
        }
    }

    [Fact]
    public async Task MapAppOptions_LanguageCollectionsIsEmpty_ShouldReturnOptionsWithOnlyValueAndTags()
    {
        // Arrange
        const string expectedTag = "tag";
        const string expectedTagName = "tagName";
        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            new Dictionary<string, string>(),
            new Dictionary<string, string>(),
            new Dictionary<string, string>(),
            [expectedTagName],
            [expectedTag]
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, null);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.Value, option.Value);
        Assert.NotNull(option.Tags);
        Assert.Single(option.Tags);
        var tag = option.Tags.Single();
        Assert.Equal(expectedTagName, tag.Key);
        Assert.Equal(expectedTag, tag.Value);
        Assert.NotNull(option.Label);
        Assert.Empty(option.Label);
        Assert.NotNull(option.Description);
        Assert.Empty(option.Description);
        Assert.NotNull(option.HelpText);
        Assert.Empty(option.HelpText);
    }

    [Fact]
    public async Task MapAppOptions_LanguageCollectionsIsNull_ShouldReturnOptionsWithOnlyValueAndTags()
    {
        // Arrange
        const string expectedTag = "tag";
        const string expectedTagName = "tagName";
        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            new Dictionary<string, string>(),
            null,
            null,
            [expectedTagName],
            [expectedTag]
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, null);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.Value, option.Value);
        Assert.NotNull(option.Tags);
        Assert.Single(option.Tags);
        var tag = option.Tags.Single();
        Assert.Equal(expectedTagName, tag.Key);
        Assert.Equal(expectedTag, tag.Value);
        Assert.Equal("", option.Label);
        Assert.Null(option.Description);
        Assert.Null(option.HelpText);
    }

    [Fact]
    public async Task MapAppOptions_NoLanguageProvided_ShouldSortAndUseFirstLanguageInDictionaryWhenNeitherNbNorEnExists()
    {
        // Arrange
        const string expectedDeLabel = "text";
        const string expectedDeDescription = "Das ist ein Text";
        const string expectedDeHelpText = "Wählen Sie diese Option, um eine Text zu erhalten";
        var labels = new Dictionary<string, string> { { "de", expectedDeLabel }, { "se", "text" } };
        var descriptions = new Dictionary<string, string>
        {
            { "de", expectedDeDescription },
            { "se", "Det här är en text" },
        };
        var helpTexts = new Dictionary<string, string>
        {
            { "se", "Välj det här alternativet för att få ett text" },
            { "de", expectedDeHelpText },
        };
        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            labels,
            descriptions,
            helpTexts
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, null);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal(expectedDeLabel, option.Label);
        Assert.Equal(expectedDeDescription, option.Description);
        Assert.Equal(expectedDeHelpText, option.HelpText);
    }

    [Fact]
    public async Task MapAppOptions_NoLanguageProvided_ShouldDefaultToEnWhenNbIsNotPresentInResponseButEnIs()
    {
        // Arrange
        var labels = new Dictionary<string, string>
        {
            { "de", "text" },
            { LanguageConst.En, Altinn3LibraryCodeListServiceTestData.EnLabel },
        };
        var descriptions = new Dictionary<string, string>
        {
            { "de", "Das ist ein Text" },
            { LanguageConst.En, Altinn3LibraryCodeListServiceTestData.EnDescription },
        };
        var helpTexts = new Dictionary<string, string>
        {
            { LanguageConst.En, Altinn3LibraryCodeListServiceTestData.EnHelpText },
            { "de", "Wählen Sie diese Option, um eine Text zu erhalten" },
        };
        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            labels,
            descriptions,
            helpTexts
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, null);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.EnLabel, option.Label);
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.EnDescription, option.Description);
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.EnHelpText, option.HelpText);
    }

    [Fact]
    public async Task MapAppOptions_NoLanguageProvided_ShouldDefaultToNbWhenNbIsPresentInResponse()
    {
        // Arrange
        var altinn3LibraryCodeListResponse =
            Altinn3LibraryCodeListServiceTestData.GetNbEnAltinn3LibraryCodeListResponse();

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, null);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.NbLabel, option.Label);
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.NbDescription, option.Description);
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.NbHelpText, option.HelpText);
    }

    [Fact]
    public async Task MapAppOptions_LanguageProvidedAndPresent_ShouldReturnOptionsWithPreferredLanguage()
    {
        // Arrange
        var altinn3LibraryCodeListResponse =
            Altinn3LibraryCodeListServiceTestData.GetNbEnAltinn3LibraryCodeListResponse();

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, LanguageConst.En);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsCacheable);
        Assert.NotNull(result.Options);
        Assert.Single(result.Options);
        var option = result.Options.Single();
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.Value, option.Value);
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.EnLabel, option.Label);
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.EnDescription, option.Description);
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.EnHelpText, option.HelpText);
        var versionParam = result.Parameters.Single(p => p.Key == "version");
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.Version, versionParam.Value);
        var sourceParam = result.Parameters.Single(p => p.Key == "source");
        Assert.Equal(Altinn3LibraryCodeListServiceTestData.SourceName, sourceParam.Value);
    }

    [Fact]
    public async Task MapAppOptions_NoTagNamesAndTagsPresent_ShouldNotReturnTagsDictionary()
    {
        // Arrange
        var labels = new Dictionary<string, string> { { LanguageConst.Nb, "Norge" } };
        var descriptions = new Dictionary<string, string> { { LanguageConst.Nb, "Et land på den nordlige halvkule" } };
        var helpTexts = new Dictionary<string, string> { { LanguageConst.Nb, "" } };

        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            labels,
            descriptions,
            helpTexts
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, LanguageConst.Nb);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.NotEmpty(result.Options);
        var optionResult = result.Options.Single();
        Assert.Null(optionResult.Tags);
    }

    [Fact]
    public async Task MapAppOptions_TagNamesPresentButNoTags_ShouldNotReturnTagsDictionary()
    {
        // Arrange
        var tagNames = new List<string> { "region", "income" };
        var labels = new Dictionary<string, string> { { LanguageConst.Nb, "Norge" } };
        var descriptions = new Dictionary<string, string> { { LanguageConst.Nb, "Et land på den nordlige halvkule" } };
        var helpTexts = new Dictionary<string, string> { { LanguageConst.Nb, "" } };

        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            labels,
            descriptions,
            helpTexts,
            tagNames
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, LanguageConst.Nb);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.NotEmpty(result.Options);
        var optionResult = result.Options.Single();
        Assert.Null(optionResult.Tags);
    }

    [Fact]
    public async Task MapAppOptions_TwoTagNamesPresentAndOneTag_ShouldNotReturnTagsDictionary()
    {
        // Arrange
        var tagNames = new List<string> { "region", "income" };
        var tags = new List<string> { "Europe" };
        var labels = new Dictionary<string, string> { { LanguageConst.Nb, "Norge" } };
        var descriptions = new Dictionary<string, string> { { LanguageConst.Nb, "Et land på den nordlige halvkule" } };
        var helpTexts = new Dictionary<string, string> { { LanguageConst.Nb, "" } };

        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            labels,
            descriptions,
            helpTexts,
            tagNames,
            tags
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, LanguageConst.Nb);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.NotEmpty(result.Options);
        var optionResult = result.Options.Single();
        Assert.Null(optionResult.Tags);
    }

    [Fact]
    public async Task MapAppOptions_TagNamesAndTagsPresent_ShouldMapTagNamesAndTagsToTagsDictionary()
    {
        // Arrange
        const string expectedFirstTagName = "region";
        const string expectedSecondTagName = "income";
        const string expectedFirstTag = "Europe";
        const string expectedSecondTag = "High";

        var tagNames = new List<string> { expectedFirstTagName, expectedSecondTagName };
        var tags = new List<string> { expectedFirstTag, expectedSecondTag };
        var labels = new Dictionary<string, string> { { LanguageConst.Nb, "Norge" } };
        var descriptions = new Dictionary<string, string> { { LanguageConst.Nb, "Et land på den nordlige halvkule" } };
        var helpTexts = new Dictionary<string, string> { { LanguageConst.Nb, "" } };

        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            labels,
            descriptions,
            helpTexts,
            tagNames,
            tags
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, LanguageConst.Nb);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.NotEmpty(result.Options);
        var optionResult = result.Options.Single();
        Assert.NotNull(optionResult.Tags);
        var tagsResult = optionResult.Tags;
        Assert.Equal(2, tagsResult.Count);
        var regionTagResult = tagsResult.SingleOrDefault(x => x.Key == expectedFirstTagName);
        Assert.Equal(expectedFirstTag, regionTagResult.Value);
        var incomeTagResult = tagsResult.SingleOrDefault(x => x.Key == expectedSecondTagName);
        Assert.Equal(expectedSecondTag, incomeTagResult.Value);
    }

    [Fact]
    public async Task MapAppOptions_TagNamesAndTagsPresentInMultipleOptions_ShouldMapTagNamesAndTagsToTagsDictionary()
    {
        // Arrange
        const string expectedFirstTagName = "region";
        const string expectedSecondTagName = "income";
        const string expectedFirstTagOptionOne = "Europe";
        const string expectedSecondTag = "High";
        const string expectedFirstTagOptionTwo = "West Asia";
        const string expectedFirstLabel = "Norge";
        const string expectedSecondLabel = "Emiratene";

        var altinn3LibraryCodeListResponse = Altinn3LibraryCodeListServiceTestData.GetAltinn3LibraryCodeListResponse(
            new Dictionary<string, string> { { LanguageConst.Nb, expectedFirstLabel } },
            new Dictionary<string, string> { { LanguageConst.Nb, "Et land på den nordlige halvkule" } },
            new Dictionary<string, string> { { LanguageConst.Nb, "" } },
            new List<string> { expectedFirstTagName, expectedSecondTagName },
            new List<string> { expectedFirstTagOptionOne, expectedSecondTag },
            new List<Altinn3LibraryCodeListItem>()
            {
                new()
                {
                    Value = "Emirates",
                    Label = new Dictionary<string, string> { { LanguageConst.Nb, expectedSecondLabel } },
                    Description = new Dictionary<string, string> { { LanguageConst.Nb, "Et land i West Asia" } },
                    HelpText = new Dictionary<string, string> { { LanguageConst.Nb, "" } },
                    Tags = new List<string> { expectedFirstTagOptionTwo, expectedSecondTag },
                },
            }
        );

        await using var fixture = Fixture.Create();

        // Act
        var altinn3LibraryCodeListService =
            fixture.ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListService>();
        var result = altinn3LibraryCodeListService.MapAppOptions(altinn3LibraryCodeListResponse, LanguageConst.Nb);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Options);
        Assert.NotEmpty(result.Options);
        Assert.Equal(2, result.Options.Count());

        var optionOneResult = result.Options.Single(x => x.Label == expectedFirstLabel);
        Assert.NotNull(optionOneResult.Tags);
        var optionsOneTagsResult = optionOneResult.Tags;
        Assert.Equal(2, optionsOneTagsResult.Count);
        var optionsOneRegionTagResult = optionsOneTagsResult.SingleOrDefault(x => x.Key == expectedFirstTagName);
        Assert.Equal(expectedFirstTagOptionOne, optionsOneRegionTagResult.Value);
        var optionOneIncomeTagResult = optionsOneTagsResult.SingleOrDefault(x => x.Key == expectedSecondTagName);
        Assert.Equal(expectedSecondTag, optionOneIncomeTagResult.Value);

        var optionTwoResult = result.Options.Single(x => x.Label == expectedSecondLabel);
        Assert.NotNull(optionTwoResult.Tags);
        var optionTwoTagsResult = optionTwoResult.Tags;
        Assert.Equal(2, optionTwoTagsResult.Count);
        var optionTwoRegionTagResult = optionTwoTagsResult.SingleOrDefault(x => x.Key == expectedFirstTagName);
        Assert.Equal(expectedFirstTagOptionTwo, optionTwoRegionTagResult.Value);
        var optionTwoIncomeTagResult = optionTwoTagsResult.SingleOrDefault(x => x.Key == expectedSecondTagName);
        Assert.Equal(expectedSecondTag, optionTwoIncomeTagResult.Value);
    }

    private sealed record Fixture(ServiceProvider ServiceProvider) : IAsyncDisposable
    {
        public required Altinn3LibraryCodeListClientMessageHandlerMock MockHandler { get; init; }

        public static Fixture Create()
        {
            var mockHandler = new Altinn3LibraryCodeListClientMessageHandlerMock(
                Altinn3LibraryCodeListServiceTestData.GetNbEnResponseMessage()
            );
            var serviceCollection = new ServiceCollection();
            serviceCollection
                .AddHttpClient<IAltinn3LibraryCodeListApiClient, Altinn3LibraryCodeListApiClient>()
                .ConfigurePrimaryHttpMessageHandler(() => mockHandler);
            serviceCollection.AddTransient<IAltinn3LibraryCodeListService, Altinn3LibraryCodeListService>();
            serviceCollection.AddHybridCache();

            return new Fixture(serviceCollection.BuildServiceProvider()) { MockHandler = mockHandler };
        }

        public async ValueTask DisposeAsync() => await ServiceProvider.DisposeAsync();
    }
}
