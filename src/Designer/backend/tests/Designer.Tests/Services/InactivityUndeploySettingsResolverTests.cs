using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Repository.Models.OrgSettings;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Models;
using Xunit;

namespace Designer.Tests.Services;

public class InactivityUndeploySettingsResolverTests
{
    [Fact]
    public void ResolveOrg_WithoutOrgSettings_ShouldReturnSystemDefault()
    {
        var settings = InactivityUndeploySettingsResolver.ResolveOrg(null);

        Assert.Equal(new InactivityUndeploySettings(UndeployOnInactivity: true, InactivityPeriodDays: 30), settings);
    }

    [Fact]
    public void ResolveOrg_WithOrgSettings_ShouldReturnThem()
    {
        var settings = InactivityUndeploySettingsResolver.ResolveOrg(
            new OrgSettingsEntity
            {
                Org = "ttd",
                UndeployOnInactivity = false,
                InactivityPeriodDays = 60,
            }
        );

        Assert.Equal(new InactivityUndeploySettings(false, 60), settings);
    }

    [Theory]
    [InlineData(null, null, false, 60)]
    [InlineData(true, null, true, 60)]
    [InlineData(null, 14, false, 14)]
    [InlineData(true, 14, true, 14)]
    public void ResolveApp_ShouldPreferEachAppValueOverTheOrgValue(
        bool? appUndeployOnInactivity,
        int? appInactivityPeriodDays,
        bool expectedUndeployOnInactivity,
        int expectedInactivityPeriodDays
    )
    {
        var orgSettings = new InactivityUndeploySettings(false, 60);
        var appSettings = new AppSettingsEntity
        {
            Org = "ttd",
            App = "app1",
            UndeployOnInactivity = appUndeployOnInactivity,
            InactivityPeriodDays = appInactivityPeriodDays,
        };

        var settings = InactivityUndeploySettingsResolver.ResolveApp(appSettings, orgSettings);

        Assert.Equal(
            new InactivityUndeploySettings(expectedUndeployOnInactivity, expectedInactivityPeriodDays),
            settings
        );
    }

    [Fact]
    public void ResolveApp_WithoutAnySettings_ShouldReturnSystemDefault()
    {
        var settings = InactivityUndeploySettingsResolver.ResolveApp(
            null,
            InactivityUndeploySettingsResolver.ResolveOrg(null)
        );

        Assert.Equal(InactivityUndeploySettingsResolver.SystemDefault, settings);
    }
}
