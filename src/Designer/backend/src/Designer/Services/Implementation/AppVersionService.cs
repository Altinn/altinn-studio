#nullable disable
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppVersionService : IAppVersionService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    private static readonly string[] s_appLibPackageNames = ["Altinn.App.Api", "Altinn.App.Api.Experimental"];

    public AppVersionService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    public SemanticVersion GetAppLibVersion(AltinnRepoEditingContext altinnRepoEditingContext)
    {
        AltinnAppGitRepository repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );

        return FindVersion(repository.FindFiles(["*.csproj"]));
    }

    private static SemanticVersion FindVersion(IEnumerable<string> csprojFiles) =>
        csprojFiles
            .Select(file =>
                PackageVersionHelper.TryGetPackageVersionFromCsprojFile(
                    file,
                    s_appLibPackageNames,
                    out SemanticVersion version
                )
                    ? version
                    : null
            )
            .FirstOrDefault(v => v is not null);
}
