#nullable enable

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;


using LocalTest.Configuration;

using LocalTest.Services.TestData;
using Microsoft.AspNetCore.Authorization;

namespace LocalTest.Controllers;

[Route("Home/[controller]/[action]")]
public class DebugUsersController : Controller
{
    private readonly LocalPlatformSettings _localPlatformSettings;
    private readonly TenorDataRepository _tenorDataRepository;

    public DebugUsersController(
        IOptions<LocalPlatformSettings> localPlatformSettings,
        TenorDataRepository tenorDataRepository)
    {
        _localPlatformSettings = localPlatformSettings.Value;
        _tenorDataRepository = tenorDataRepository;
    }

    // Debugging endpoint
    [AllowAnonymous]
    public async Task<IActionResult> LocalTestUsersRaw()
    {
        var localData = await TestDataDiskReader.ReadFromDisk(_localPlatformSettings.LocalTestingStaticTestDataPath);

        return Json(localData);
    }

    //Debugging endpoint
    [AllowAnonymous]
    public async Task<IActionResult> LocalTestUsers()
    {
        var localData = await TestDataDiskReader.ReadFromDisk(_localPlatformSettings.LocalTestingStaticTestDataPath);
        var constructedAppData = AppTestDataModel.FromTestDataModel(localData);

        return Json(constructedAppData);
    }

    // Debugging endpoint
    [AllowAnonymous]
    public async Task<IActionResult> LocalTestUsersRoundTrip()
    {
        var localData = await TestDataDiskReader.ReadFromDisk(_localPlatformSettings.LocalTestingStaticTestDataPath);
        var constructedAppData = AppTestDataModel.FromTestDataModel(localData);

        return Json(constructedAppData.GetTestDataModel());
    }

    // Debugging endpoint
    [AllowAnonymous]
    public async Task<IActionResult> ShowTenorUsers()
    {
        var localData = await _tenorDataRepository.GetAppTestDataModel();

        return Json(localData);
    }
}