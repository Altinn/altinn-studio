using System.Collections.Generic;
using System.IO;
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
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );

        IEnumerable<string> csprojFiles = altinnAppGitRepository.FindFiles(["*.csproj"]);

        foreach (string csprojFile in csprojFiles)
        {
            if (PackageVersionHelper.TryGetPackageVersionFromCsprojFile(csprojFile, s_appLibPackageNames, out SemanticVersion version))
            {
                return version;
            }
        }

        throw new FileNotFoundException("Unable to extract the version of the app-lib from csproj files.");
    }
}
