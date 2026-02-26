#nullable enable
using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.AppRegistry;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.TestData;

public class TestDataService
{
    private readonly ILocalApp _localApp;
    private readonly TenorDataRepository _tenorDataRepository;
    private readonly IMemoryCache _cache;
    private readonly LocalPlatformSettings _settings;
    private readonly ILogger<TestDataService> _logger;
    private readonly AppRegistryService _appRegistryService;

    public TestDataService(ILocalApp localApp, TenorDataRepository tenorDataRepository, IOptions<LocalPlatformSettings> settings, IMemoryCache memoryCache, ILogger<TestDataService> logger, AppRegistryService appRegistryService)
    {
        _localApp = localApp;
        _tenorDataRepository = tenorDataRepository;
        _cache = memoryCache;
        _settings = settings.Value;
        _logger = logger;
        _appRegistryService = appRegistryService;
    }

    public async Task<TestDataModel> GetTestData()
    {
        return (await _cache.GetOrCreateAsync("TEST_DATA",
            async (entry) =>
            {
                entry.SlidingExpiration = TimeSpan.FromSeconds(5);
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);

                var diskModel = await TestDataDiskReader.ReadFromDisk(_settings.LocalTestingStaticTestDataPath);

                try
                {
                    var appResult = await _localApp.GetTestDataWithMetadata();
                    if (appResult.Data is not null)
                    {
                        var appModel = appResult.Data.GetTestDataModel();

                        // If ALL apps provided testData, use ONLY that testData (no built-in users)
                        // If ANY app lacks testData, merge app data INTO disk data (built-in users included)
                        if (appResult.AllAppsHaveData)
                        {
                            _logger.LogInformation("Using only app-provided test data (no built-in users)");
                            return appModel;
                        }

                        _logger.LogInformation("Merging app test data with built-in users");
                        TestDataMerger.MergeTestData(appModel, diskModel, "app testData");
                        return diskModel;
                    }
                }
                catch (HttpRequestException e)
                {
                    _logger.LogInformation(e, "Fetching Test data from app failed.");
                }

                var tenorUsers = await _tenorDataRepository.GetAppTestDataModel();
                if (tenorUsers is not null && !tenorUsers.IsEmpty())
                {
                    // Merge tenor users INTO disk data
                    var tenorModel = tenorUsers.GetTestDataModel();
                    TestDataMerger.MergeTestData(tenorModel, diskModel, "Tenor users");
                    return diskModel;
                }

                // Return built-in users (Ola Nordmann, Sofie Salt, etc.) if no other users are available
                return diskModel;
            }))!;
    }

    public void InvalidateCache()
    {
        _cache.Remove("TEST_DATA");
    }
}
