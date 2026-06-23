using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppTemplatePackageVersionService : IAppTemplatePackageVersionService
{
    private const string NugetOrgPackageVersionsUrl = "https://api.nuget.org/v3-flatcontainer/{0}/index.json";

    private static readonly string[] s_appPackageNames = ["Altinn.App.Api", "Altinn.App.Core"];

    private readonly HttpClient _httpClient;

    public AppTemplatePackageVersionService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<string> GetLatestStableAppPackageVersion(CancellationToken cancellationToken = default)
    {
        IReadOnlyCollection<NuGetVersion>[] stableVersionsPerPackage = await Task.WhenAll(
            s_appPackageNames.Select(packageName => GetStableVersions(packageName, cancellationToken))
        );

        IEnumerable<NuGetVersion> sharedVersions = stableVersionsPerPackage.First();
        foreach (IReadOnlyCollection<NuGetVersion> packageVersions in stableVersionsPerPackage.Skip(1))
        {
            sharedVersions = sharedVersions.Intersect(packageVersions);
        }

        NuGetVersion latestVersion = sharedVersions.OrderByDescending(version => version).FirstOrDefault();
        return latestVersion?.ToNormalizedString()
            ?? throw new InvalidOperationException(
                $"Could not find a shared stable version for packages {string.Join(", ", s_appPackageNames)}."
            );
    }

    private async Task<IReadOnlyCollection<NuGetVersion>> GetStableVersions(
        string packageName,
        CancellationToken cancellationToken
    )
    {
        string packageVersionsUrl = string.Format(NugetOrgPackageVersionsUrl, packageName.ToLowerInvariant());
        using HttpResponseMessage response = await _httpClient.GetAsync(packageVersionsUrl, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        PackageVersionsResponse packageVersionsResponse =
            await JsonSerializer.DeserializeAsync<PackageVersionsResponse>(
                responseStream,
                cancellationToken: cancellationToken
            )
            ?? throw new InvalidOperationException($"Could not read versions for package {packageName}.");

        if (packageVersionsResponse.Versions is null || packageVersionsResponse.Versions.Count == 0)
        {
            throw new InvalidOperationException($"Could not find any versions for package {packageName}.");
        }

        IReadOnlyCollection<string> versions = packageVersionsResponse.Versions;
        return versions.Select(NuGetVersion.Parse).Where(version => !version.IsPrerelease).ToList();
    }

    private sealed record PackageVersionsResponse(
        [property: JsonPropertyName("versions")] IReadOnlyCollection<string>? Versions
    );
}
