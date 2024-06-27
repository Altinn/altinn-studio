using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Service for handling options lists.
/// </summary>
public class OptionsService : IOptionsService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    public OptionsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    /// <inheritdoc />
    public async Task<List<Option>> GetOptionsList(string org, string repo, string developer, string optionsListId)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        string optionsListString = await altinnAppGitRepository.GetOptions(optionsListId);
        var optionsList = JsonSerializer.Deserialize<List<Option>>(optionsListString);

        return optionsList;
    }

    /// <inheritdoc />
    public async Task<List<Option>> UpdateOptionsList(string org, string repo, string developer, string optionsListId, List<Option> optionsListPayload)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        string optionsListPayloadString = JsonSerializer.Serialize(optionsListPayload);
        string createdOptionsListString = await altinnAppGitRepository.CreateOrOverwriteOptions(optionsListId, optionsListPayloadString);
        var createdOptionsList = JsonSerializer.Deserialize<List<Option>>(createdOptionsListString);

        return createdOptionsList;
    }
}
