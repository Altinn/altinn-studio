using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Testing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.Platform.Profile.Enums;
using Altinn.Platform.Register.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService : IBootstrapGlobalService
{
    private readonly IAppMetadata _appMetadata;
    private readonly IAppResources _appResources;
    private readonly IProfileClient _profileClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IApplicationLanguage _applicationLanguage;
    private readonly GeneralSettings _generalSettings;
    private readonly FrontEndSettings _frontEndSettings;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
    public BootstrapGlobalService(
        IAppMetadata appMetadata,
        IAppResources appResources,
        IProfileClient profileClient,
        IHttpContextAccessor httpContextAccessor,
        IApplicationLanguage applicationLanguage,
        IOptions<GeneralSettings> generalSettings,
        IOptions<FrontEndSettings> frontEndSettings
    )
    {
        _appMetadata = appMetadata;
        _appResources = appResources;
        _profileClient = profileClient;
        _httpContextAccessor = httpContextAccessor;
        _applicationLanguage = applicationLanguage;
        _generalSettings = generalSettings.Value;
        _frontEndSettings = frontEndSettings.Value;
    }

    public async Task<BootstrapGlobalResponse> GetGlobalState(
        string org,
        string app,
        string? language = null
    )
    {
        var response = new BootstrapGlobalResponse();
        var tasks = new List<Task>();

        var appMetadataTask = _appMetadata.GetApplicationMetadata();
        tasks.Add(appMetadataTask);
        response.AvailableLanguages = await GetAvailableLanguages();
        var user = _httpContextAccessor.HttpContext?.User;

        if (user?.Identity?.IsAuthenticated == true)
        {
            var userId = user.GetUserIdAsInt();
            if (userId.HasValue)
            {
                var userProfileTask = _profileClient.GetUserProfile(userId.Value);
                tasks.Add(userProfileTask);
            }
        }

        tasks.Add(GetFooterLayout(response));

        // Set frontend settings
        response.FrontEndSettings = _frontEndSettings;

        // Get language and text resources
        language ??= GetLanguageFromContext();
        response.AvailableLanguages = await GetAvailableLanguages();

        var textResourcesTask = GetTextResources(org, app, language, response);
        tasks.Add(textResourcesTask);

        await Task.WhenAll(tasks);
        return response;
    }

    private async Task<List<Altinn.App.Core.Models.ApplicationLanguage>> GetAvailableLanguages()
    {
        return await _applicationLanguage.GetApplicationLanguages();
    }

    private async Task GetFooterLayout(BootstrapGlobalResponse response)
    {
        var footerJson = await _appResources.GetFooter();
        if (!string.IsNullOrEmpty(footerJson))
        {
            response.FooterLayout = JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
        }
    }

    private string GetLanguageFromContext()
    {
        var acceptLanguageHeader = _httpContextAccessor.HttpContext?.Request.Headers["Accept-Language"].ToString();
        if (!string.IsNullOrEmpty(acceptLanguageHeader))
        {
            var languages = acceptLanguageHeader.Split(',');
            foreach (var lang in languages)
            {
                var cleanLang = lang.Split(';')[0].Trim().Substring(0, 2).ToLower(CultureInfo.InvariantCulture);
                if (_generalSettings.LanguageCodes?.Contains(cleanLang) == true)
                {
                    return cleanLang;
                }
            }
        }
        return "nb";
    }

    private async Task GetTextResources(string org, string app, string language, BootstrapGlobalResponse response)
    {
        response.TextResources = await _appResources.GetTexts(org, app, language);
    }
}
