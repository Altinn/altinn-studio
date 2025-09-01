using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Exceptions.Options;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
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
    private readonly IGiteaContentLibraryService _giteaContentLibraryService;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    /// <param name="giteaContentLibraryService">IGiteaContentLibraryService</param>
    public OptionsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IGiteaContentLibraryService giteaContentLibraryService)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _giteaContentLibraryService = giteaContentLibraryService;
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

    public async Task<List<OptionListData>> GetOptionLists(string org, string repo, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string[] optionListIds = GetOptionsListIds(org, repo, developer);

        var tasks = optionListIds.Select(optionListId =>
            RetrieveOptionsListAndConvertToOptionListData(org, repo, developer, optionListId, cancellationToken));

        return (await Task.WhenAll(tasks)).ToList();
    }

    private async Task<OptionListData> RetrieveOptionsListAndConvertToOptionListData(string org, string repo, string developer, string optionListId, CancellationToken cancellationToken)
    {
        try
        {
            List<Option> options = await GetOptionsList(org, repo, developer, optionListId, cancellationToken);
            return new OptionListData
            {
                Title = optionListId,
                Data = options,
                HasError = false
            };
        }
        catch (InvalidOptionsFormatException)
        {
            return new OptionListData
            {
                Title = optionListId,
                HasError = true
            };
        }
    }

    private static void ValidateOption(Option option)
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
    public async Task<(List<OptionListData>, Dictionary<string, TextResource>)> ImportOptionListFromOrg(string org, string repo, string developer, string optionListId, bool overwriteTextResources, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        bool optionListExists = await OptionsListExists(org, repo, developer, optionListId, cancellationToken);
        if (optionListExists)
        {
            throw new ConflictingFileNameException($"The options file {optionListId}.json already exists.");
        }

        List<Option> importedCodeList = await CopyCodeListFromOrg(org, repo, developer, optionListId, cancellationToken);
        Dictionary<string, TextResource> textResources = await CopyTextResourcesFromOrg(org, repo, developer, importedCodeList, overwriteTextResources, cancellationToken);
        List<OptionListData> optionLists = await GetOptionLists(org, repo, developer, cancellationToken);

        await SaveMetadataForImportedOptionList(org, repo, developer, optionListId);
        return (optionLists, textResources);
    }

    private async Task<List<Option>> CopyCodeListFromOrg(string org, string repo, string developer, string optionListId, CancellationToken cancellationToken)
    {
        List<Option> codeList = await _giteaContentLibraryService.GetCodeList(org, optionListId);
        return await CreateOrOverwriteOptionsList(org, repo, developer, optionListId, codeList, cancellationToken);
    }

    private async Task<Dictionary<string, TextResource>> CopyTextResourcesFromOrg(string org, string repo, string developer, List<Option> optionList, bool overwriteTextResources, CancellationToken cancellationToken)
    {
        AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        List<string> orgLanguageCodes = await _giteaContentLibraryService.GetLanguages(org);
        Dictionary<string, TextResource> appTextResources = await RetrieveAppTextResources(altinnAppGitRepository, cancellationToken);

        foreach (string orgLanguageCode in orgLanguageCodes)
        {
            List<TextResourceElement> appTextResourceElements = RetrieveAppTextResourceElements(appTextResources, orgLanguageCode);
            List<TextResourceElement> orgTextResourceElements = await RetrieveOrgTextResourceElements(org, orgLanguageCode, optionList);

            TextResource mergedTextResources = new()
            {
                Language = orgLanguageCode,
                Resources = MergeTextResources(appTextResourceElements, orgTextResourceElements, overwriteTextResources)
            };

            appTextResources[orgLanguageCode] = mergedTextResources;
            await altinnAppGitRepository.SaveText(orgLanguageCode, mergedTextResources);
        }

        return appTextResources;
    }

    private static async Task<Dictionary<string, TextResource>> RetrieveAppTextResources(AltinnAppGitRepository altinnAppGitRepository, CancellationToken cancellationToken)
    {
        List<string> appLanguageCodes = altinnAppGitRepository.GetLanguages();

        var tasks = appLanguageCodes.Select(async languageCode => new
        {
            LanguageCode = languageCode,
            Resources = await altinnAppGitRepository.GetText(languageCode, cancellationToken)
        });

        var results = await Task.WhenAll(tasks);

        return results.ToDictionary(x => x.LanguageCode, x => x.Resources);

    }

    private static List<TextResourceElement> RetrieveAppTextResourceElements(Dictionary<string, TextResource> appTextResources, string languageCode)
    {
        if (appTextResources.TryGetValue(languageCode, out TextResource textResource))
        {
            return textResource.Resources ?? [];
        }

        return [];

    }

    private async Task<List<TextResourceElement>> RetrieveOrgTextResourceElements(string org, string languageCode, List<Option> optionList)
    {
        TextResource orgTextResources = await _giteaContentLibraryService.GetTextResource(org, languageCode);
        HashSet<string> optionListTextResourceIds = RetrieveTextResourceIdsInOptionList(optionList);
        return orgTextResources.Resources.Where(element => optionListTextResourceIds.Contains(element.Id)).ToList();
    }

    private static HashSet<string> RetrieveTextResourceIdsInOptionList(List<Option> optionList)
    {
        HashSet<string> textResourceIds = [];
        foreach (Option option in optionList)
        {
            if (!string.IsNullOrEmpty(option.Label)) { textResourceIds.Add(option.Label); }
            if (!string.IsNullOrEmpty(option.Description)) { textResourceIds.Add(option.Description); }
            if (!string.IsNullOrEmpty(option.HelpText)) { textResourceIds.Add(option.HelpText); }
        }
        return textResourceIds;
    }

    private static List<TextResourceElement> MergeTextResources(List<TextResourceElement> appTextResourceElements, List<TextResourceElement> orgTextResourceElements, bool overwriteTextResource)
    {
        HashSet<string> commonTextResourceIds = FindCommonTextResourceIds(appTextResourceElements, orgTextResourceElements);

        if (overwriteTextResource)
        {
            appTextResourceElements.RemoveAll(element => commonTextResourceIds.Contains(element.Id));
        }
        else
        {
            orgTextResourceElements.RemoveAll(element => commonTextResourceIds.Contains(element.Id));
        }
        return appTextResourceElements.Concat(orgTextResourceElements).ToList();
    }

    private static HashSet<string> FindCommonTextResourceIds(List<TextResourceElement> appTextResourceElements, List<TextResourceElement> orgTextResourceElements)
    {
        IEnumerable<string> appTextResourceIds = appTextResourceElements.Select(textResourceElement => textResourceElement.Id);
        IEnumerable<string> orgTextResourceIds = orgTextResourceElements.Select(textResourceElement => textResourceElement.Id);
        return appTextResourceIds.Intersect(orgTextResourceIds).ToHashSet();
    }

    private async Task SaveMetadataForImportedOptionList(string org, string repo, string developer, string optionListId)
    {
        var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repo, developer);
        var settings = await altinnGitRepository.GetAltinnStudioSettings();
        var importMetadata = new ImportMetadata
        {
            ImportDate = $"{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss}",
            ImportSource = ImportSourceName(org),
            Version = await _giteaContentLibraryService.GetShaForCodeListFile(org, optionListId),
        };

        settings.Imports ??= new ImportedResources();
        settings.Imports.CodeLists ??= new Dictionary<string, ImportMetadata>();
        settings.Imports.CodeLists[optionListId] = importMetadata;

        await altinnGitRepository.SaveAltinnStudioSettings(settings);
    }

    private static string ImportSourceName(string org)
    {
        return $"{org}/{StaticContentRepoName(org)}";
    }

    private static string StaticContentRepoName(string org)
    {
        return $"{org}-content";
    }
}
