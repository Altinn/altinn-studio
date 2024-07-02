using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Service for handling options (code lists).
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
    public string[] GetOptionListIds(string org, string repo, string developer)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        try
        {
            string[] optionLists = altinnAppGitRepository.GetOptionListIds();
            return optionLists;
        }
        catch (NotFoundException) // Is raised if the Options folder does not exist
        {
            return [];
        }
    }

    /// <inheritdoc />
    public async Task<List<Option>> GetOptions(string org, string repo, string developer, string optionListId)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        string optionListString = await altinnAppGitRepository.GetOptions(optionListId);
        var optionList = JsonSerializer.Deserialize<List<Option>>(optionListString);

        return optionList;
    }

    /// <inheritdoc />
    public async Task<List<Option>> UpdateOptions(string org, string repo, string developer, string optionListId, List<Option> payload)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
        string payloadString = JsonSerializer.Serialize(payload, jsonOptions);

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

    /// <inheritdoc />
    public async Task<bool> OptionListExists(string org, string repo, string developer, string optionListId)
    {
        try
        {
            await GetOptions(org, repo, developer, optionListId);
            return true;
        }
        catch (NotFoundException)
        {
            return false;
        }
    }
}
