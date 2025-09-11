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
    private readonly IGitea _gitea;
    private const string Repo = "content";

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    /// <param name="gitea">IGitea</param>
    public OrgCodeListService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IGitea gitea)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _gitea = gitea;
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
    public async Task<List<CodeListWrapper>> GetCodeListsNew(string org, string developer, CancellationToken cancellationToken = default)
    {
        List<FileSystemObject> files = await _gitea.GetCodeListDirectoryAsync(org, GetStaticContentRepo(org), cancellationToken);

        List<CodeListWrapper> codeListWrappers = [];
        foreach (FileSystemObject file in files)
        {
            if (TryParseFile(file.Content, out CodeList? codeList))
            {
                codeListWrappers.Add(WrapCodeList(codeList, file.Name, hasError: false));
            }
            codeListWrappers.Add(WrapCodeList(codeList, file.Name, hasError: true));
        }
        return codeListWrappers;
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

    /// <inheritdoc />
    public async Task UpdateCodeLists(string org, string developer, List<CodeListWrapper> codeListWrappers, CancellationToken cancellationToken = default)
    {
        List<FileSystemObject> files = await _gitea.GetCodeListDirectoryAsync(org, GetStaticContentRepo(org), cancellationToken);

        List<CodeListWrapper> remoteCodeListWrappers = [];
        Dictionary<string, string> fileMetadata = [];
        foreach (FileSystemObject file in files)
        {
            if (TryParseFile(file.Content, out CodeList? codeList))
            {
                remoteCodeListWrappers.Add(WrapCodeList(codeList, file.Name, hasError: false));
                fileMetadata[file.Name] = file.Sha;
            }
            remoteCodeListWrappers.Add(WrapCodeList(codeList, file.Name, hasError: true));
        }

        (List<CodeListWrapper> add, List<CodeListWrapper> update, List<CodeListWrapper> delete) = CompareCodeLists(remoteCodeListWrappers, codeListWrappers);

        var fileChangeContexts = new List<FileChangeContext>();
        foreach (CodeListWrapper codeListWrapper in add)
        {
            string content = JsonSerializer.Serialize(codeListWrapper.CodeList, new JsonSerializerOptions { WriteIndented = true });
            fileChangeContexts.Add(new FileChangeContext
            {
                Path = $"CodeLists/{codeListWrapper.Title}.json",
                Content = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(content)),
                Operation = FileOperation.Create
            });
        }

        foreach (CodeListWrapper codeListWrapper in update)
        {
            string content = JsonSerializer.Serialize(codeListWrapper.CodeList, new JsonSerializerOptions { WriteIndented = true });
            fileChangeContexts.Add(new FileChangeContext
            {
                Path = $"CodeLists/{codeListWrapper.Title}.json",
                Content = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(content)),
                Operation = FileOperation.Update,
                Sha = fileMetadata[codeListWrapper.Title]
            });
        }

        foreach (CodeListWrapper codeListWrapper in delete)
        {
            fileChangeContexts.Add(new FileChangeContext
            {
                Path = $"CodeLists/{codeListWrapper.Title}.json",
                Operation = FileOperation.Delete,
                Sha = fileMetadata[codeListWrapper.Title]
            });
        }

        GiteaMultipleFilesDto dto = new()
        {
            Committer = new Designer.Models.Dto.Identity { Name = developer },
            Author = new Designer.Models.Dto.Identity { Name = developer },
            Files = fileChangeContexts,
            Message = "Update code lists" // TODO: get from user
        };

        await _gitea.ModifyMultipleFiles(org, GetStaticContentRepo(org), dto, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> UploadCodeList(string org, string developer, IFormFile payload, CancellationToken cancellationToken = default)
    {
        await Task.Delay(0, cancellationToken);
        throw new NotImplementedException();
        // cancellationToken.ThrowIfCancellationRequested();
        // string repo = GetStaticContentRepo(org);
        // string codeListId = payload.FileName.Replace(".json", "");

        // List<Option> deserializedCodeList = JsonSerializer.Deserialize<List<Option>>(payload.OpenReadStream(),
        //     new JsonSerializerOptions { WriteIndented = true, AllowTrailingCommas = true });

        // bool codeListHasInvalidNullFields = deserializedCodeList.Exists(codeListItem => codeListItem.Value == null || codeListItem.Label == null);
        // if (codeListHasInvalidNullFields)
        // {
        //     throw new InvalidOptionsFormatException("Uploaded file is missing one of the following attributes for an option: value or label.");
        // }

        // AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);
        // await altinnOrgGitRepository.CreateCodeList(codeListId, deserializedCodeList, cancellationToken);

        // List<OptionListData> codeLists = await GetCodeLists(org, developer, cancellationToken);
        // return codeLists;
    }

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

    private void ValidateOption(Option option)
    {
        var validationContext = new ValidationContext(option);
        Validator.ValidateObject(option, validationContext, validateAllProperties: true);
    }

    /// <summary>
    /// Converts a <see cref="CodeList"/> to a <see cref="CodeListWrapper"/>
    /// </summary>
    /// <param name="codeList"></param>
    /// <param name="title"></param>
    /// <param name="hasError"></param>
    /// <returns><see cref="CodeListWrapper"/> </returns>
    private static CodeListWrapper WrapCodeList(CodeList? codeList, string title, bool hasError)
    {
        var codeListWrapper = new CodeListWrapper
        {
            Title = title,
            CodeList = codeList,
            HasError = hasError
        };
        return codeListWrapper;
    }

    private static (List<CodeListWrapper> toAdd, List<CodeListWrapper> toUpdate, List<CodeListWrapper> toDelete) CompareCodeLists(List<CodeListWrapper> remoteCodeListWrappers, List<CodeListWrapper> localCodeListWrappers)
    {
        List<CodeListWrapper> toAdd = [];
        List<CodeListWrapper> toUpdate = [];
        List<CodeListWrapper> toDelete = [];

        foreach (CodeListWrapper localWrapper in localCodeListWrappers)
        {
            foreach (CodeListWrapper remoteWrapper in remoteCodeListWrappers)
            {
                if (localWrapper.Title == remoteWrapper.Title)
                {
                    if (localWrapper.CodeList is not null && !localWrapper.CodeList.Equals(remoteWrapper.CodeList))
                    {
                        toUpdate.Add(localWrapper); // UPDATE
                    }
                    break;
                }
                if (remoteWrapper.CodeList is null && localWrapper.CodeList is not null)
                {
                    toAdd.Add(localWrapper); // CREATE
                }
                if (remoteWrapper.CodeList is not null && localWrapper.CodeList is null)
                {
                    toDelete.Add(remoteWrapper); // DELETE
                }
            }
        }

        return (toAdd, toUpdate, toDelete);
    }

    /// <summary>
    /// Tries to parse file content string into a <see cref="CodeList"/> object.
    /// </summary>
    /// <param name="fileContent">The file content as a string.</param>
    /// <param name="codeList">The parsed code list, or null if parsing failed.</param>
    private static bool TryParseFile(string? fileContent, out CodeList? codeList)
    {
        if (string.IsNullOrEmpty(fileContent))
        {
            codeList = null;
            return false;
        }
        try
        {
            codeList = JsonSerializer.Deserialize<CodeList>(fileContent);
            return true;
        }
        catch (Exception ex) when (ex is ValidationException or JsonException or ArgumentNullException)
        {
            codeList = null;
            return false;
        }
    }

    /// <summary>
    /// Get the name of the static content repository for the given org.
    /// </summary>
    /// <param name="org"></param>
    /// <returns>The full repository name.</returns>
    private static string GetStaticContentRepo(string org)
    {
        return $"{org}-{Repo}";
    }
}
