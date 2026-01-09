using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.Language;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Features.Options.Altinn3LibraryProvider;

public class Altinn3LibraryOptionsProviderCacheTests
{
    private const string ClientName = "Altinn3LibraryClient";
    private const string OptionId = "SomeId";
    private const string Org = "ttd";
    private const string CodeListId = "SomeCodeListId";
    private const string Version = "1";

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_TwoCallsRequestingDifferentHybridCacheKeys_ShouldCallMessageHandlerTwice()
    {
        // Arrange
        const string optionIdTwo = "SomeOtherId";
        const string codeListIdTwo = "SomeOtherCodeListId";

        await using var fixture = Fixture.Create(services =>
            services.AddAltinn3CodeList(optionId: optionIdTwo, org: Org, codeListId: codeListIdTwo, version: Version)
        );

        var serviceProvider = fixture.ServiceProvider;

        // Act/Assert: First scope
        using (var scope = serviceProvider.CreateScope())
        {
            var optionsProvider = scope
                .ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>()
                .Single(p => p.Id == OptionId);
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());

            Assert.Equal(1, fixture.MockHandler.CallCount);
        }

        // Second scope
        using (var scope = serviceProvider.CreateScope())
        {
            var optionsProvider = scope
                .ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>()
                .Single(p => p.Id == optionIdTwo);
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());

            Assert.Equal(2, fixture.MockHandler.CallCount);
        }
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_RequestsDifferentLanguageOnTheSameOptionId_ShouldCallMessageHandlerOnce()
    {
        // Arrange
        await using var fixture = Fixture.Create();

        var serviceProvider = fixture.ServiceProvider;

        // Act/Assert: First scope
        using (var scope = serviceProvider.CreateScope())
        {
            var optionsProvider = scope
                .ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>()
                .Single(p => p.Id == OptionId);
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());

            Assert.Equal(1, fixture.MockHandler.CallCount);
        }

        // Second scope - should use cache
        using (var scope = serviceProvider.CreateScope())
        {
            var optionsProvider = scope
                .ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>()
                .Single(p => p.Id == OptionId);
            // Language is different
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nn, new Dictionary<string, string>());

            // Still only 1 call because of caching
            Assert.Equal(1, fixture.MockHandler.CallCount);
        }
    }

    [Fact]
    public async Task Altinn3LibraryOptionsProvider_RequestsWithTheSameParametersTwice_ShouldCallMessageHandlerOnce()
    {
        // Arrange
        await using var fixture = Fixture.Create();

        var serviceProvider = fixture.ServiceProvider;

        // Act/Assert: First scope
        using (var scope = serviceProvider.CreateScope())
        {
            var optionsProvider = scope
                .ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>()
                .Single(p => p.Id == OptionId);
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());

            Assert.Equal(1, fixture.MockHandler.CallCount);
        }

        // Second scope - should use cache
        using (var scope = serviceProvider.CreateScope())
        {
            var optionsProvider = scope
                .ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>()
                .Single(p => p.Id == OptionId);
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());

            // Still only 1 call because of caching
            Assert.Equal(1, fixture.MockHandler.CallCount);
        }
    }

    private sealed record Fixture(ServiceProvider ServiceProvider) : IAsyncDisposable
    {
        public required Altinn3LibraryOptionsProviderMessageHandlerMock MockHandler { get; init; }

        public static Fixture Create(Action<IServiceCollection>? configure = null)
        {
            var mockHandler = new Altinn3LibraryOptionsProviderMessageHandlerMock(
                Altinn3LibraryOptionsProviderTestData.GetNbEnResponseMessage()
            );
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
