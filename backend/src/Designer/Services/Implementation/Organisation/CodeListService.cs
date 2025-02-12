using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.Options;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Implementation.Organisation;

public class CodeListService : ICodeListService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    public CodeListService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> GetCodeLists(string org, string repo, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string[] codelistIds = GetCodeListIds(org, repo, developer);
        List<OptionListData> codeLists = [];
        foreach (string codeListId in codelistIds)
        {
            try
            {
                List<Option> codeList = await GetCodeList(org, repo, developer, codeListId, cancellationToken);
                OptionListData codeListData = new()
                {
                    Title = codeListId,
                    Data = codeList,
                    HasError = false
                };
                codeLists.Add(codeListData);
            }
            catch (InvalidOptionsFormatException)
            {
                OptionListData codeListData = new()
                {
                    Title = codeListId,
                    Data = null,
                    HasError = true
                };
                codeLists.Add(codeListData);
            }
        }

        return codeLists;
    }

    private void ValidateOption(Option option)
    {
        var validationContext = new ValidationContext(option);
        Validator.ValidateObject(option, validationContext, validateAllProperties: true);
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> CreateCodeList(string org, string repo, string developer, string codeListId, List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        await altinnOrgGitRepository.CreateCodeList(codeListId, codeList, cancellationToken);
        List<OptionListData> codeLists = await GetCodeLists(org, repo, developer, cancellationToken);

        return codeLists;
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> UpdateCodeList(string org, string repo, string developer, string codeListId, List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        await altinnOrgGitRepository.UpdateCodeList(codeListId, codeList, cancellationToken);
        List<OptionListData> codeLists = await GetCodeLists(org, repo, developer, cancellationToken);

        return codeLists;
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> UploadCodeList(string org, string repo, string developer, string codeListId, IFormFile payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        List<Option> deserializedOptions = JsonSerializer.Deserialize<List<Option>>(payload.OpenReadStream(),
            new JsonSerializerOptions { WriteIndented = true, AllowTrailingCommas = true });

        bool codeListHasInvalidNullFields = deserializedOptions.Exists(option => option.Value == null || option.Label == null);
        if (codeListHasInvalidNullFields)
        {
            throw new InvalidOptionsFormatException("Uploaded file is missing one of the following attributes for an option: value or label.");
        }

        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);
        await altinnOrgGitRepository.CreateCodeList(codeListId, deserializedOptions, cancellationToken);
        List<OptionListData> codeLists = await GetCodeLists(org, repo, developer, cancellationToken);

        return codeLists;
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> DeleteCodeList(string org, string repo, string developer, string codeListId, CancellationToken cancellationToken = default)
    {
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        altinnOrgGitRepository.DeleteCodeList(codeListId);

        List<OptionListData> codeLists = await GetCodeLists(org, repo, developer, cancellationToken);

        return codeLists;
    }

    /// <inheritdoc />
    public async Task<bool> CodeListExists(string org, string repo, string developer, string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            await GetCodeList(org, repo, developer, codeListId, cancellationToken);
            return true;
        }
        catch (NotFoundException)
        {
            return false;
        }
    }

    private string[] GetCodeListIds(string org, string repo, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        try
        {
            string[] codeListIds = altinnOrgGitRepository.GetCodeListIds();
            return codeListIds;
        }
        catch (NotFoundException) // Is raised if the Codelists folder does not exist
        {
            return [];
        }
    }

    private async Task<List<Option>> GetCodeList(string org, string repo, string developer, string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        List<Option> codeList;

        string codeListString = await altinnOrgGitRepository.GetCodeList(codeListId, cancellationToken);
        try
        {
            codeList = JsonSerializer.Deserialize<List<Option>>(codeListString);
            codeList.ForEach(ValidateOption);
        }
        catch (Exception ex) when (ex is ValidationException || ex is JsonException)
        {
            throw new InvalidOptionsFormatException($"One or more of the options have an invalid format in code-list: {codeListId}.");
        }

        return codeList;
    }
}
