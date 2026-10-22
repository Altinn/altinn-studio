using System.Text.Json;
using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Implementation;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.TestData;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace LocalTest.Tests.TestData;

public sealed class TestDataServiceTests : IDisposable
{
    private readonly string _root = Path.Join(Path.GetTempPath(), $"localtest-testdata-{Guid.NewGuid():N}");

    [Fact]
    public async Task GetTestData_CallerCancels_CachesNothing()
    {
        var appData = JsonSerializer.Deserialize<AppTestDataModel>(
            """
            {
              "persons": [{ "partyId": 501337, "ssn": "01017001337", "firstName": "Ola", "lastName": "Nordmann", "userId": 1337 }],
              "orgs": [],
              "systems": []
            }
            """,
            LocalAppHttp.JSON_OPTIONS
        );
        var localApp = new Mock<ILocalApp>();
        localApp
            .Setup(app => app.GetTestDataWithMetadata(It.IsAny<CancellationToken>()))
            .Returns(
                (CancellationToken token) =>
                    token.IsCancellationRequested
                        ? Task.FromCanceled<ILocalApp.TestDataResult>(token)
                        : Task.FromResult(new ILocalApp.TestDataResult(appData, AllAppsHaveData: true))
            );
        var service = CreateService(localApp.Object);

        // Treating the cancellation as a failing app would cache the built-in users alone
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            service.GetTestData(new CancellationToken(canceled: true))
        );
        var testData = await service.GetTestData();

        Assert.Contains("1337", testData.Profile.User.Keys);
    }

    private TestDataService CreateService(ILocalApp localApp)
    {
        // The built-in test data, empty
        string staticTestData = Path.Join(_root, "testdata");
        foreach (
            string folder in new[]
            {
                "authorization/claims",
                "authorization/partylist",
                "authorization/roles",
                "authorization/systems",
                "Profile/User",
                "Register/Org",
                "Register/Party",
                "Register/Person",
            }
        )
        {
            Directory.CreateDirectory(Path.Join(staticTestData, folder));
        }

        var settings = Options.Create(
            new LocalPlatformSettings
            {
                LocalTestingStorageBasePath = Path.Join(_root, "storage"),
                LocalTestingStaticTestDataPath = staticTestData,
            }
        );
        return new TestDataService(
            localApp,
            new TenorDataRepository(settings),
            settings,
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<TestDataService>.Instance
        );
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }
}
