#nullable enable
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

public class OrgCodeListService : IOrgCodeListService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private const string Repo = "content";

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    public OrgCodeListService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> GetCodeLists(string org, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        List<string> codeListIds = GetCodeListIds(org, developer, cancellationToken);
        List<OptionListData> codeLists = [];
        foreach (string codeListId in codeListIds)
        {
            try
            {
                List<Option> codeList = await GetCodeList(org, developer, codeListId, cancellationToken);
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

    /// <inheritdoc />
    public async Task<List<OptionListData>> CreateCodeList(string org, string developer, string codeListId, List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        await altinnOrgGitRepository.CreateCodeList(codeListId, codeList, cancellationToken);

        List<OptionListData> codeLists = await GetCodeLists(org, developer, cancellationToken);
        return codeLists;
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> UpdateCodeList(string org, string developer, string codeListId, List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        await altinnOrgGitRepository.UpdateCodeList(codeListId, codeList, cancellationToken);

        List<OptionListData> codeLists = await GetCodeLists(org, developer, cancellationToken);
        return codeLists;
    }

#nullable disable
    /// <inheritdoc />
    public async Task<List<OptionListData>> UploadCodeList(string org, string developer, IFormFile payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        string codeListId = payload.FileName.Replace(".json", "");
        List<Option> deserializedCodeList = JsonSerializer.Deserialize<List<Option>>(payload.OpenReadStream(),
            new JsonSerializerOptions { WriteIndented = true, AllowTrailingCommas = true });

        bool codeListHasInvalidNullFields = deserializedCodeList.Exists(codeListItem => codeListItem.Value == null || codeListItem.Label == null);
        if (codeListHasInvalidNullFields)
        {
            throw new InvalidOptionsFormatException("Uploaded file is missing one of the following attributes for an option: value or label.");
        }

        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);
        await altinnOrgGitRepository.CreateCodeList(codeListId, deserializedCodeList, cancellationToken);

        List<OptionListData> codeLists = await GetCodeLists(org, developer, cancellationToken);
        return codeLists;
    }
#nullable enable

    /// <inheritdoc />
    public async Task<List<OptionListData>> DeleteCodeList(string org, string developer, string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        altinnOrgGitRepository.DeleteCodeList(codeListId, cancellationToken);

        List<OptionListData> codeLists = await GetCodeLists(org, developer, cancellationToken);
        return codeLists;
    }

    /// <inheritdoc />
    public async Task<bool> CodeListExists(string org, string developer, string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            await GetCodeList(org, developer, codeListId, cancellationToken);
            return true;
        }
        catch (NotFoundException)
        {
            return false;
        }
    }

    public List<string> GetCodeListIds(string org, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        List<string> codeListIds = altinnOrgGitRepository.GetCodeListIds(cancellationToken);
        return codeListIds;
    }

    public void UpdateCodeListId(string org, string developer, string codeListId, string newCodeListId)
    {
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        altinnOrgGitRepository.UpdateCodeListId(codeListId, newCodeListId);
    }

    private async Task<List<Option>> GetCodeList(string org, string developer, string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        try
        {
            List<Option> codeList = await altinnOrgGitRepository.GetCodeList(codeListId, cancellationToken);
            codeList.ForEach(ValidateOption);
            return codeList;
        }
        catch (Exception ex) when (ex is ValidationException || ex is JsonException)
        {
            throw new InvalidOptionsFormatException($"One or more of the options have an invalid format in code list: {codeListId}.");
        }
    }

    /// <inheritdoc />
    public async Task<List<CodeListWrapper>> GetCodeListsNew(string org, string developer, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        List<string> codeListIds = GetCodeListIds(org, developer, cancellationToken);
        List<CodeListWrapper> codeLists = [];
        foreach (string codeListId in codeListIds)
        {
            try
            {
                CodeList codeList = await GetCodeListNew(org, developer, codeListId, cancellationToken);
                codeLists.Add(WrapCodeList(codeListId, codeList, false));
            }
            catch (InvalidOptionsFormatException)
            {
                codeLists.Add(WrapCodeList(codeListId, null, true));
            }
        }

        return codeLists;
    }

    private static CodeListWrapper WrapCodeList(string codeListId, CodeList? codeList, bool hasError)
    {
        return new CodeListWrapper
        {
            Title = codeListId,
            CodeList = codeList,
            HasError = hasError
        };
    }

    private async Task<CodeList> GetCodeListNew(string org, string developer, string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        try
        {
            CodeList codeList = await altinnOrgGitRepository.GetCodeListNew(codeListId, cancellationToken);
            codeList.Codes.ForEach(ValidateCodeList);
            return codeList;
        }
        catch (Exception ex) when (ex is ValidationException || ex is JsonException)
        {
            throw new InvalidOptionsFormatException($"One or more of the options have an invalid format in code list: {codeListId}.");
        }
    }

    /// <inheritdoc />
    public async Task<List<CodeListWrapper>> CreateCodeListNew(string org, string developer, string codeListId, CodeList codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        await altinnOrgGitRepository.CreateCodeListNew(codeListId, codeList, cancellationToken);

        return await GetCodeListsNew(org, developer, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<CodeListWrapper>> UpdateCodeListNew(string org, string developer, string codeListId, CodeList codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        await altinnOrgGitRepository.UpdateCodeListNew(codeListId, codeList, cancellationToken);

        return await GetCodeListsNew(org, developer, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<CodeListWrapper>> DeleteCodeListNew(string org, string developer, string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        altinnOrgGitRepository.DeleteCodeList(codeListId, cancellationToken);

        return await GetCodeListsNew(org, developer, cancellationToken);
    }

    private static void ValidateOption(Option option)
    {
        var validationContext = new ValidationContext(option);
        Validator.ValidateObject(option, validationContext, validateAllProperties: true);
    }

    private static void ValidateCodeList(Code code)
    {
        var validationContext = new ValidationContext(code);
        Validator.ValidateObject(code, validationContext, validateAllProperties: true);
    }

    private static string GetStaticContentRepo(string org)
    {
        return $"{org}-{Repo}";
    }
}
