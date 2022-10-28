#nullable enable
using LocalTest.Configuration;
using LocalTest.Services.LocalApp.Interface;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.TestData;

public class TestDataService
{
    private readonly ILocalApp _localApp;
    private readonly LocalPlatformSettings _settings;
    private readonly IMemoryCache _cache;
    private readonly ILogger<TestDataService> _logger;
    public TestDataService(ILocalApp localApp, IOptions<LocalPlatformSettings> settings, IMemoryCache memoryCache, ILogger<TestDataService> logger)
    {
        _cache = memoryCache;
        _localApp = localApp;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<TestDataModel> GetTestData()
    {
        return await _cache.GetOrCreateAsync("TEST_DATA",
            async (entry) =>
            {
                entry.SlidingExpiration = TimeSpan.FromSeconds(5);
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
                return await TestDataDiskReader.ReadFromDisk(_settings.LocalTestingStaticTestDataPath);
            });
    }
}
