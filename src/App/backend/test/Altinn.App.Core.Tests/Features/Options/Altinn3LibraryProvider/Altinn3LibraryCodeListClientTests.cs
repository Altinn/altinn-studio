using System.Net;
using Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;

namespace Altinn.App.Core.Tests.Features.Options.Altinn3LibraryProvider;

public class Altinn3LibraryCodeListClientTests
{
    [Fact]
    public async Task Altinn3LibraryCodeListClient_OnSuccess_ShouldReturnCodeList()
    {
        // Arrange
        const string org = "ttd";
        const string codeListId = "SomeCodeListId";
        const string version = "1";
        await using var fixture = Fixture.Create(Altinn3LibraryCodeListServiceTestData.GetNbEnResponseMessage());

        // Act
        var result = await fixture
            .Altinn3LibraryCodeListApiClient()
            .GetAltinn3LibraryCodeList(org, codeListId, version);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task Altinn3LibraryCodeListClient_UnexpectedResponseCode_ShouldThrowAndLogError()
    {
        // Arrange
        const string org = "ttd";
        const string codeListId = "SomeCodeListId";
        const string version = "1";
        const HttpStatusCode expectedStatusCode = HttpStatusCode.Conflict;
        const string expectedContent = "Conflict";
        var fakeLogger = new FakeLogger<Altinn3LibraryCodeListApiClient>();
        await using var fixture = Fixture.Create(
            () => new HttpResponseMessage(expectedStatusCode) { Content = new StringContent(expectedContent) },
            services => services.AddSingleton<ILogger<Altinn3LibraryCodeListApiClient>>(fakeLogger)
        );

        // Act
        var result = await Assert.ThrowsAsync<HttpRequestException>(() =>
            fixture.Altinn3LibraryCodeListApiClient().GetAltinn3LibraryCodeList(org, codeListId, version)
        );

        // Assert
        var latestRecord = fakeLogger.LatestRecord;
        Assert.NotNull(latestRecord);
        Assert.Equal(LogLevel.Error, latestRecord.Level);
        Assert.Equal(
            $"Exception thrown in GetAltinn3LibraryCodeLists. Code list id: {codeListId}, Version: {version}, Org: {org}",
            latestRecord.Message
        );
        Assert.Equal($"Unexpected response from Altinn3Library. Status code: {expectedStatusCode}", result.Message);
    }

    private sealed record Fixture(ServiceProvider ServiceProvider) : IAsyncDisposable
    {
        public IAltinn3LibraryCodeListApiClient Altinn3LibraryCodeListApiClient() =>
            ServiceProvider.GetRequiredService<IAltinn3LibraryCodeListApiClient>();

        public static Fixture Create(
            Func<HttpResponseMessage> responseMessage,
            Action<IServiceCollection>? configure = null
        )
        {
            var mockHandler = new Altinn3LibraryCodeListClientMessageHandlerMock(responseMessage);
            var serviceCollection = new ServiceCollection();
            serviceCollection
                .AddHttpClient<IAltinn3LibraryCodeListApiClient, Altinn3LibraryCodeListApiClient>()
                .ConfigurePrimaryHttpMessageHandler(() => mockHandler);
            configure?.Invoke(serviceCollection);

            return new Fixture(serviceCollection.BuildServiceProvider());
        }

        public async ValueTask DisposeAsync() => await ServiceProvider.DisposeAsync();
    }
}
