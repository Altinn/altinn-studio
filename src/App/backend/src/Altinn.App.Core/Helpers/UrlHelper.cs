using Altinn.App.Core.Configuration;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Helpers;

internal class UrlHelper
{
    private readonly GeneralSettings _settings;

    public UrlHelper(IOptions<GeneralSettings> settings)
    {
        _settings = settings.Value;
    }

    /// <summary>
    /// Get the url for an instance of an app
    /// </summary>
    /// <param name="app">The app identifier</param>
    /// <param name="instance">The instance identifier</param>
    /// <returns>The url for the app</returns>
    public string GetInstanceUrl(AppIdentifier app, InstanceIdentifier instance)
    {
        string baseUrl = _settings.FormattedExternalAppBaseUrlWithTrailingPound(app);

        string url = $"{baseUrl}/instance/{instance.InstanceOwnerPartyId}/{instance.InstanceGuid}";

        return url;
    }
}
