using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Redirect;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService(
    IAppMetadata appMetadata,
    IAppResources appResources,
    IOptions<FrontEndSettings> frontEndSettings,
    IApplicationLanguage applicationLanguage,
    IReturnUrlService returnUrlService,
    IProfileClient profileClient,
    IHttpContextAccessor httpContextAccessor,
    IAuthenticationContext authenticationContext
) : IBootstrapGlobalService
{
    private readonly IAppMetadata _appMetadata = appMetadata;
    private readonly IAppResources _appResources = appResources;
    private readonly IOptions<FrontEndSettings> _frontEndSettings = frontEndSettings;
    private readonly IApplicationLanguage _applicationLanguage = applicationLanguage;
    private readonly IProfileClient _profileClient = profileClient;
    private readonly IAuthenticationContext _authenticationContext = authenticationContext;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<BootstrapGlobalResponse> GetGlobalState(string? redirectUrl)
    {
        var appMetadataTask = _appMetadata.GetApplicationMetadata();

        var footerTask = GetFooterLayout();

        var availableLanguagesTask = _applicationLanguage.GetApplicationLanguages();

        var layoutSets = _appResources.GetLayoutSets() ?? new LayoutSets { Sets = [] };
        layoutSets.UiSettings ??= new GlobalPageSettings();

        var validatedUrl = returnUrlService.Validate(redirectUrl);

        var userProfileTask = GetUserProfileOrNull();

        var currentPartyTask = GetCurrentParty();

        await Task.WhenAll(appMetadataTask, footerTask, availableLanguagesTask, userProfileTask, currentPartyTask);

        return new BootstrapGlobalResponse
        {
            ApplicationMetadata = await appMetadataTask,
            Footer = await footerTask,
            LayoutSets = layoutSets,
            AvailableLanguages = await availableLanguagesTask,
            FrontEndSettings = _frontEndSettings.Value,
            ReturnUrl = validatedUrl.DecodedUrl is not null ? validatedUrl.DecodedUrl : null,
            UserProfile = await userProfileTask,
            SelectedParty = await currentPartyTask,
        };
    }

    private async Task<UserProfile?> GetUserProfileOrNull()
    {
        var user = httpContextAccessor.HttpContext?.User;
        var userId = user?.GetUserIdAsInt();
        if (userId == null)
        {
            return null;
        }

        return await _profileClient.GetUserProfile(userId.Value);
    }

    private async Task<object?> GetFooterLayout()
    {
        var footerJson = await _appResources.GetFooter();
        return string.IsNullOrEmpty(footerJson)
            ? null
            : JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
    }

    private async Task<Party?> GetCurrentParty()
    {
        var context = _authenticationContext.Current;
        switch (context)
        {
            case Authenticated.None:
                return null;
            case Authenticated.User user:
            {
                var details = await user.LoadDetails(validateSelectedParty: true);
                if (details.CanRepresent is null)
                    throw new Exception("Couldn't validate selected party");
                return details.SelectedParty;
            }
            case Authenticated.Org org:
            {
                var details = await org.LoadDetails();
                return details.Party;
            }
            case Authenticated.ServiceOwner so:
            {
                var details = await so.LoadDetails();
                return details.Party;
            }
            case Authenticated.SystemUser su:
            {
                var details = await su.LoadDetails();
                return details.Party;
            }
            default:
                throw new Exception($"Unknown authentication context: {context.GetType().Name}");
        }
    }
}
