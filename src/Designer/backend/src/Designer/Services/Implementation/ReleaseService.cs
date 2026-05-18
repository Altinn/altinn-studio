#nullable disable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;
using Microsoft.Rest.TransientFaultHandling;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// The business logic service for release
/// </summary>
public class ReleaseService : IReleaseService
{
    private readonly IAzureDevOpsBuildClient _azureDevOpsBuildClient;
    private readonly AzureDevOpsSettings _azureDevOpsSettings;
    private readonly IReleaseRepository _releaseRepository;
    private readonly IAppScopesService _appScopesService;
    private readonly IGiteaClient _giteaClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly GeneralSettings _generalSettings;
    private readonly IFeatureManager _featureManager;
    private readonly IApiKeyService _apiKeyService;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ReleaseService> _logger;

    /// <summary>
    /// Constructor
    /// </summary>
    public ReleaseService(
        IHttpContextAccessor httpContextAccessor,
        IAzureDevOpsBuildClient azureDevOpsBuildClient,
        IReleaseRepository releaseRepository,
        IAppScopesService appScopesService,
        IGiteaClient giteaClient,
        AzureDevOpsSettings azureDevOpsOptions,
        GeneralSettings generalSettings,
        IFeatureManager featureManager,
        IApiKeyService apiKeyService,
        TimeProvider timeProvider,
        ILogger<ReleaseService> logger
    )
    {
        _azureDevOpsSettings = azureDevOpsOptions;
        _azureDevOpsBuildClient = azureDevOpsBuildClient;
        _releaseRepository = releaseRepository;
        _appScopesService = appScopesService;
        _giteaClient = giteaClient;
        _httpContextAccessor = httpContextAccessor;
        _generalSettings = generalSettings;
        _featureManager = featureManager;
        _apiKeyService = apiKeyService;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<ReleaseEntity> CreateAsync(ReleaseEntity release)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var cancellationToken = httpContext.RequestAborted;
        cancellationToken.ThrowIfCancellationRequested();
        release.PopulateBaseProperties(release.Org, release.App, httpContext);

        await ValidateUniquenessOfRelease(release, cancellationToken);

        var (deployToken, authHeaderName) = await GetDeployTokenAsync(httpContext);
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContext);
        AppScopesEntity appScopes = await EnsureDefaultMaskinportenScopesForBuild(
            release,
            developer,
            cancellationToken
        );
        string appMaskinportenScopes = SerializeAppScopes(appScopes);

        QueueBuildParameters queueBuildParameters = new()
        {
            AppCommitId = release.TargetCommitish,
            AppOwner = release.Org,
            AppRepo = release.App,
            TagName = release.TagName,
            GiteaEnvironment = $"{_generalSettings.HostName}/repos",
            AppDeployToken = deployToken,
            AppAuthHeaderName = authHeaderName,
            AltinnStudioHostname = _generalSettings.HostName,
            AppMaskinportenScopes = appMaskinportenScopes,
        };

        // NOTE: these codepaths are sensitive to leaving partial state/progress if the user/caller
        // cancels the request, but we prefer to atleast attempt the completion once we've started mutating some state
        // This particular multi-step process starts mutating state by queueing the ADO build
        cancellationToken = CancellationToken.None;
        Build queuedBuild = await _azureDevOpsBuildClient.QueueAsync(
            queueBuildParameters,
            _azureDevOpsSettings.BuildDefinitionId,
            cancellationToken
        );

        release.Build = new BuildEntity
        {
            Id = queuedBuild.Id.ToString(),
            Status = queuedBuild.Status,
            Result = BuildResult.None,
            Started = queuedBuild.StartTime,
        };

        return await _releaseRepository.Create(release);
    }

    /// <inheritdoc/>
    public async Task<SearchResults<ReleaseEntity>> GetAsync(string org, string app, DocumentQueryModel query)
    {
        IEnumerable<ReleaseEntity> results = await _releaseRepository.Get(org, app, query);
        return new SearchResults<ReleaseEntity> { Results = results };
    }

    /// <inheritdoc/>
    public async Task UpdateAsync(string buildNumber, string appOwner)
    {
        IEnumerable<ReleaseEntity> releaseDocuments = await _releaseRepository.Get(appOwner, buildNumber);
        ReleaseEntity releaseEntity = releaseDocuments.Single();

        BuildEntity buildEntity = await _azureDevOpsBuildClient.Get(buildNumber, CancellationToken.None);
        ReleaseEntity release = new() { Build = buildEntity };

        releaseEntity.Build.Status = release.Build.Status;
        releaseEntity.Build.Result = release.Build.Result;
        releaseEntity.Build.Started = release.Build.Started;
        releaseEntity.Build.Finished = release.Build.Finished;

        await _releaseRepository.Update(releaseEntity);
    }

    private async Task ValidateUniquenessOfRelease(ReleaseEntity release, CancellationToken _)
    {
        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        IEnumerable<ReleaseEntity> existingReleaseEntity = await _releaseRepository.Get(
            release.Org,
            release.App,
            release.TagName,
            buildStatus,
            buildResult
        );
        if (existingReleaseEntity.Any())
        {
            throw new HttpRequestWithStatusException("A release with the same properties already exist.")
            {
                StatusCode = HttpStatusCode.Conflict,
            };
        }
    }

    private async Task<(string Token, string AuthHeaderName)> GetDeployTokenAsync(HttpContext httpContext)
    {
        if (await _featureManager.IsEnabledAsync(StudioFeatureFlags.StudioOidc))
        {
            string username = AuthenticationHelper.GetDeveloperUserName(httpContext);
            var (rawKey, _) = await _apiKeyService.CreateAsync(
                username,
                $"release-{_timeProvider.GetUtcNow():yyyyMMddHHmmss}",
                Altinn.Studio.Designer.Models.ApiKey.ApiKeyType.System,
                _timeProvider.GetUtcNow().AddHours(1)
            );
            return (rawKey, "X-Api-Key");
        }

        return (await httpContext.GetDeveloperAppTokenAsync(), null);
    }

    private async Task<AppScopesEntity> EnsureDefaultMaskinportenScopesForBuild(
        ReleaseEntity release,
        string developer,
        CancellationToken cancellationToken
    )
    {
        using var activity = StartActivity(nameof(EnsureDefaultMaskinportenScopesForBuild), release);
        var context = AltinnRepoContext.FromOrgRepo(release.Org, release.App);
        var appScopes = await _appScopesService.GetAppScopesAsync(context, cancellationToken);
        bool hasDefaultScopes = DefaultMaskinportenScopes.ContainsAll(appScopes?.Scopes);
        activity?.SetTag("maskinporten.default_scopes_present", hasDefaultScopes);

        if (!hasDefaultScopes && await ShouldAddDefaultMaskinportenScopes(release, cancellationToken))
        {
            appScopes = await _appScopesService.AddDefaultMaskinportenScopesAsync(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(release.Org, release.App, developer),
                cancellationToken
            );
            activity?.SetTag("maskinporten.default_scopes_added", true);
        }
        else
        {
            activity?.SetTag("maskinporten.default_scopes_added", false);
        }

        return appScopes;
    }

    private static string SerializeAppScopes(AppScopesEntity appScopes)
    {
        if (appScopes?.Scopes is null || appScopes.Scopes.Count == 0)
        {
            return "[]";
        }

        var scopeList = appScopes.Scopes.Select(s => s.Scope).ToArray();
        return JsonSerializer.Serialize(scopeList);
    }

    private async Task<bool> ShouldAddDefaultMaskinportenScopes(
        ReleaseEntity release,
        CancellationToken cancellationToken
    )
    {
        FileSystemObject appCsproj;
        try
        {
            appCsproj = await _giteaClient.GetFileAsync(
                release.Org,
                release.App,
                "App/App.csproj",
                release.TargetCommitish,
                cancellationToken
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            Activity.Current?.SetTag("maskinporten.default_scopes_app_csproj_fetch_failed", true);
            _logger.LogWarning(
                ex,
                "Could not fetch App.csproj while checking default Maskinporten scopes for {Org}/{App} at {TargetCommitish}.",
                release.Org,
                release.App,
                release.TargetCommitish
            );
            return false;
        }

        if (appCsproj?.Content is null)
        {
            return false;
        }

        try
        {
            string csprojContent = Encoding.UTF8.GetString(Convert.FromBase64String(appCsproj.Content));
            string[] packageNames = ["Altinn.App.Api", "Altinn.App.Api.Experimental"];

            return PackageVersionHelper.TryGetPackageVersionFromCsprojContent(
                    csprojContent,
                    packageNames,
                    out SemanticVersion version
                )
                && version.Major >= 9;
        }
        catch (FormatException ex)
        {
            Activity.Current?.SetTag("maskinporten.default_scopes_app_csproj_decode_failed", true);
            _logger.LogWarning(ex, "Could not decode App.csproj content while checking default Maskinporten scopes.");
            return false;
        }
        catch (XmlException ex)
        {
            _logger.LogWarning(ex, "Could not parse App.csproj while checking default Maskinporten scopes.");
            return false;
        }
    }

    private static Activity StartActivity(string methodName, ReleaseEntity release)
    {
        var activity = ServiceTelemetry.Source.StartActivity($"{nameof(ReleaseService)}.{methodName}");
        activity?.SetTag("org", release.Org);
        activity?.SetTag("repository", release.App);
        activity?.SetTag("target_commitish", release.TargetCommitish);
        return activity;
    }
}
