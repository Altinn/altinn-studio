using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Service for handling option lists.
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
    public async Task<List<Option>> GetOptions(string org, string repo, string developer, string optionListId)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        string optionsListString = await altinnAppGitRepository.GetOptions(optionListId);
        var optionsList = JsonSerializer.Deserialize<List<Option>>(optionsListString);

        return optionsList;
    }

    /// <inheritdoc />
    public async Task<List<Option>> UpdateOptions(string org, string repo, string developer, string optionListId, List<Option> payload)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        string payloadString = JsonSerializer.Serialize(payload);
        string updatedOptionsString = await altinnAppGitRepository.CreateOrOverwriteOptions(optionListId, payloadString);
        var updatedOptions = JsonSerializer.Deserialize<List<Option>>(updatedOptionsString);

        return updatedOptions;
    }

    /// <inheritdoc />
    public void DeleteOptions(string org, string repo, string developer, string optionListId)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        altinnAppGitRepository.DeleteOptions(optionListId);
    }
}
