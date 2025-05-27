using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.Options;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Service for handling options lists (code lists).
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
    public string[] GetOptionsListIds(string org, string repo, string developer)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        try
        {
            string[] optionsLists = altinnAppGitRepository.GetOptionsListIds();
            return optionsLists;
        }
        catch (NotFoundException) // Is raised if the Options folder does not exist
        {
            return [];
        }
    }

    /// <inheritdoc />
    public async Task<List<Option>> GetOptionsList(string org, string repo, string developer, string optionsListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        List<Option> optionsList;

        string optionsListString = await altinnAppGitRepository.GetOptionsList(optionsListId, cancellationToken);
        try
        {
            optionsList = JsonSerializer.Deserialize<List<Option>>(optionsListString);
            optionsList.ForEach(ValidateOption);
        }
        catch (Exception ex) when (ex is ValidationException || ex is JsonException)
        {
            throw new InvalidOptionsFormatException($"One or more of the options have an invalid format in option list: {optionsListId}.");
        }

        return optionsList;
    }


    private void ValidateOption(Option option)
    {
        var validationContext = new ValidationContext(option);
        Validator.ValidateObject(option, validationContext, validateAllProperties: true);
    }

    /// <inheritdoc />
    public async Task<List<Option>> CreateOrOverwriteOptionsList(string org, string repo, string developer, string optionsListId, List<Option> payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        string updatedOptionsString = await altinnAppGitRepository.CreateOrOverwriteOptionsList(optionsListId, payload, cancellationToken);
        var updatedOptions = JsonSerializer.Deserialize<List<Option>>(updatedOptionsString);

        return updatedOptions;
    }

    /// <inheritdoc />
    public async Task<List<Option>> UploadNewOption(string org, string repo, string developer, string optionsListId, IFormFile payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        List<Option> deserializedOptions = JsonSerializer.Deserialize<List<Option>>(payload.OpenReadStream(),
            new JsonSerializerOptions { WriteIndented = true, AllowTrailingCommas = true });

        bool optionListHasInvalidNullFields = deserializedOptions.Exists(option => option.Value == null || option.Label == null);
        if (optionListHasInvalidNullFields)
        {
            throw new InvalidOptionsFormatException("Uploaded file is missing one of the following attributes for an option: value or label.");
        }

        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        await altinnAppGitRepository.CreateOrOverwriteOptionsList(optionsListId, deserializedOptions, cancellationToken);

        return deserializedOptions;
    }

    /// <inheritdoc />
    public void DeleteOptionsList(string org, string repo, string developer, string optionsListId)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        altinnAppGitRepository.DeleteOptionsList(optionsListId);
    }

    /// <inheritdoc />
    public async Task<bool> OptionsListExists(string org, string repo, string developer, string optionsListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            await GetOptionsList(org, repo, developer, optionsListId, cancellationToken);
            return true;
        }
        catch (NotFoundException)
        {
            return false;
        }
    }

    /// <inheritdoc />
    public void UpdateOptionsListId(AltinnRepoEditingContext altinnRepoEditingContext, string optionsListId,
        string newOptionsListName, CancellationToken cancellationToken = default)
    {
        AltinnAppGitRepository altinnAppGitRepository =
            _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org,
                altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
        altinnAppGitRepository.UpdateOptionsListId($"{optionsListId}.json", $"{newOptionsListName}.json");
    }

    /// <inheritdoc />
    public async Task<List<Option>> ImportOptionListFromOrgIfIdIsVacant(string org, string repo, string developer, string optionListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        bool optionListExists = await OptionsListExists(org, repo, developer, optionListId, cancellationToken);
        if (optionListExists)
        {
            return null;
        }

        return await ImportOptionListFromOrg(org, repo, developer, optionListId, cancellationToken);
    }

    private async Task<List<Option>> ImportOptionListFromOrg(string org, string repo, string developer, string optionListId, CancellationToken cancellationToken)
    {
        AltinnOrgGitRepository altinnOrgGitRepository = GetStaticContentRepo(org, developer);
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

        List<Option> codeList = await altinnOrgGitRepository.GetCodeList(optionListId, cancellationToken);
        string createdOptionListString = await altinnAppGitRepository.CreateOrOverwriteOptionsList(optionListId, codeList, cancellationToken);
        return JsonSerializer.Deserialize<List<Option>>(createdOptionListString);
    }

    private AltinnOrgGitRepository GetStaticContentRepo(string org, string developer)
    {
        string repository = StaticContentRepoName(org);
        return _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repository, developer);
    }

    private static string StaticContentRepoName(string org)
    {
        return $"{org}-content";
    }
}
