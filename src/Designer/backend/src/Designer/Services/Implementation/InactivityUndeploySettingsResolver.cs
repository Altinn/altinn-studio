using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Repository.Models.OrgSettings;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Resolves the effective inactivity undeploy settings. Each value comes from the app's settings, then the org's,
/// then the system default.
/// </summary>
public static class InactivityUndeploySettingsResolver
{
    public const int MinimumInactivityPeriodDays = 7;
    public const int MaximumInactivityPeriodDays = 365;

    public static readonly InactivityUndeploySettings SystemDefault = new(
        UndeployOnInactivity: true,
        InactivityPeriodDays: 30
    );

    public static InactivityUndeploySettings ResolveOrg(OrgSettingsEntity? orgSettings) =>
        orgSettings is null
            ? SystemDefault
            : new InactivityUndeploySettings(orgSettings.UndeployOnInactivity, orgSettings.InactivityPeriodDays);

    public static InactivityUndeploySettings ResolveApp(
        AppSettingsEntity? appSettings,
        InactivityUndeploySettings orgSettings
    ) =>
        new(
            appSettings?.UndeployOnInactivity ?? orgSettings.UndeployOnInactivity,
            appSettings?.InactivityPeriodDays ?? orgSettings.InactivityPeriodDays
        );
}
