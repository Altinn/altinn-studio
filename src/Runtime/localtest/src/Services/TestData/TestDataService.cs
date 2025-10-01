#nullable enable
using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;
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
    public TestDataService(ILocalApp localApp, TenorDataRepository tenorDataRepository, IOptions<LocalPlatformSettings> settings, IMemoryCache memoryCache, ILogger<TestDataService> logger)
    {
        _localApp = localApp;
        _tenorDataRepository = tenorDataRepository;
        _cache = memoryCache;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<TestDataModel> GetTestData()
    {
        return (await _cache.GetOrCreateAsync("TEST_DATA",
            async (entry) =>
            {
                entry.SlidingExpiration = TimeSpan.FromSeconds(5);
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);

                var diskModel = await TestDataDiskReader.ReadFromDisk(_settings.LocalTestingStaticTestDataPath);
                void PopulateDefaults(TestDataModel model)
                {
                    // TODO: this is weird
                    model.Authorization.Systems = diskModel.Authorization.Systems;
                    model.Authorization.SystemUsers = diskModel.Authorization.SystemUsers;
                }

                try
                {
                    var appData = await _localApp.GetTestData();

                    if (appData is not null)
                    {
                        var model = appData.GetTestDataModel();
                        return model;
                    }
                }
                catch (HttpRequestException e)
                {
                    _logger.LogInformation(e, "Fetching Test data from app failed.");
                }

                var tenorUsers = await _tenorDataRepository.GetAppTestDataModel();
                if (tenorUsers is not null && !tenorUsers.IsEmpty())
                {
                    // Use tenor users if they exist
                    var model = tenorUsers.GetTestDataModel();
                    PopulateDefaults(model);
                    return model;
                }

                //Fallback to Ola Nordmann, Sofie Salt ... if no other users are availible
                return diskModel;
            }))!;
    }
}
