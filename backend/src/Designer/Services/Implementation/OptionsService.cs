using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Service for handling options lists.
/// </summary>
public class OptionsService : IOptionsService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IApplicationMetadataService _applicationMetadataService;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    /// <param name="applicationMetadataService">IApplicationMetadataService</param>
    public OptionsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IApplicationMetadataService applicationMetadataService)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _applicationMetadataService = applicationMetadataService;
    }

    /// <inheritdoc />
    public async Task<List<Dictionary<string, string>>> GetOptions(string org, string repo, string developer, string optionsListId)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        string optionsListString = await altinnAppGitRepository.GetOptions(optionsListId);
        var optionsList = JsonConvert.DeserializeObject<List<Dictionary<string, string>>>(optionsListString);

        return optionsList;
    }
}
