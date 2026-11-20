using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Microsoft.Extensions.Logging;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Reads the version of the app libraries from the release's project file and from the app that runs in the
/// environment, the same source the admin panel uses, and compares them with <see cref="DeployWarnings.For"/>.
/// </summary>
public sealed class DeployWarningsService(
    IReleaseRepository releaseRepository,
    IGiteaClient giteaClient,
    IAppResourcesService appResourcesService,
    IEnvironmentsService environmentsService,
    TimeProvider timeProvider,
    ILogger<DeployWarningsService> logger
) : IDeployWarningsService
{
    private const string ProductionEnvironmentType = "production";

    // The deploy confirmation waits for the warnings. An app that is down would otherwise hold it for the whole
    // timeout of the HTTP client.
    private static readonly TimeSpan s_environmentVersionTimeout = TimeSpan.FromSeconds(5);

    /// <inheritdoc />
    public async Task<DeployWarnings?> Get(
        string org,
        string app,
        string tagName,
        string envName,
        CancellationToken cancellationToken
    )
    {
        ReleaseEntity? release = (
            await releaseRepository.Get(org, app, tagName, null, [BuildResult.Succeeded.ToEnumMemberAttributeValue()])
        ).FirstOrDefault();
        EnvironmentModel? environment = (await environmentsService.GetEnvironments()).FirstOrDefault(item =>
            item.Name == envName
        );
        if (release is null || environment is null)
        {
            return null;
        }

        Task<SemanticVersion?> releaseVersion = GetReleaseAppLibVersion(
            org,
            app,
            release.TargetCommitish,
            cancellationToken
        );
        Task<SemanticVersion?> environmentVersion = GetEnvironmentAppLibVersion(org, app, envName, cancellationToken);
        await Task.WhenAll(releaseVersion, environmentVersion);

        bool toProduction = string.Equals(
            environment.Type,
            ProductionEnvironmentType,
            StringComparison.OrdinalIgnoreCase
        );
        return DeployWarnings.For(await releaseVersion, await environmentVersion, toProduction);
    }

    // A version that is not a literal in the project file, such as one from Directory.Packages.props, cannot be read
    // here (issue #20309), and is then unknown.
    private async Task<SemanticVersion?> GetReleaseAppLibVersion(
        string org,
        string app,
        string commit,
        CancellationToken cancellationToken
    )
    {
        FileSystemObject? appCsproj;
        try
        {
            appCsproj = await giteaClient.GetFileAsync(
                org,
                app,
                PackageVersionHelper.AppCsprojPath,
                commit,
                cancellationToken
            );
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                ex,
                "Could not fetch App.csproj for deploy warnings for {Org}/{App} at {Commit}.",
                org.WithoutLineBreaks(),
                app.WithoutLineBreaks(),
                commit
            );
            return null;
        }

        if (appCsproj?.Content is null)
        {
            return null;
        }

        try
        {
            return PackageVersionHelper.TryGetPackageVersionFromCsprojContent(
                Convert.FromBase64String(appCsproj.Content),
                PackageVersionHelper.AppLibPackageNames,
                out SemanticVersion version
            )
                ? version
                : null;
        }
        catch (Exception ex) when (ex is FormatException or XmlException)
        {
            logger.LogWarning(
                ex,
                "Could not read App.csproj for deploy warnings for {Org}/{App} at {Commit}.",
                org.WithoutLineBreaks(),
                app.WithoutLineBreaks(),
                commit
            );
            return null;
        }
    }

    private async Task<SemanticVersion?> GetEnvironmentAppLibVersion(
        string org,
        string app,
        string envName,
        CancellationToken cancellationToken
    )
    {
        using var timeout = new CancellationTokenSource(s_environmentVersionTimeout, timeProvider);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token);
        try
        {
            var applicationMetadata = await appResourcesService.GetApplicationMetadata(org, envName, app, linked.Token);
            return NuGetVersion.TryParse(applicationMetadata?.AltinnNugetVersion, out NuGetVersion? version)
                ? version
                : null;
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            // Such as an app that does not run in the environment, or does not answer.
            return null;
        }
    }
}
