#nullable enable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.CodeList;
using Altinn.Studio.Designer.Exceptions.Options;
using Altinn.Studio.Designer.Helpers;
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
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true
    };

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
    public async Task<List<CodeListWrapper>> GetCodeListsNew(string org, string? reference = null, CancellationToken cancellationToken = default)
    {
        string repository = GetStaticContentRepo(org);
        List<FileSystemObject> files = await _gitea.GetCodeListDirectoryContentAsync(org, repository, reference, cancellationToken);

        List<CodeListWrapper> codeListWrappers = [];
        foreach (FileSystemObject file in files)
        {
            string title = Path.GetFileNameWithoutExtension(file.Name);
            if (TryParseFile(file.Content, out CodeList? codeList))
            {
                codeListWrappers.Add(WrapCodeList(codeList, title, hasError: false));
                continue;
            }
            codeListWrappers.Add(WrapCodeList(codeList, title, hasError: true));
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
    public async Task UpdateCodeListsNew(string org, string developer, List<CodeListWrapper> codeListWrappers, string? commitMessage = null, string? reference = null, CancellationToken cancellationToken = default)
    {
        ValidateCodeListTitles(codeListWrappers);
        ValidateCommitMessage(commitMessage);

        string repository = GetStaticContentRepo(org);

        List<FileSystemObject> files = await _gitea.GetCodeListDirectoryContentAsync(org, repository, reference, cancellationToken);
        List<FileOperationContext> fileOperationContexts = CreateFileOperationContexts(codeListWrappers, files);
        GiteaMultipleFilesDto dto = CreateGiteaMultipleFilesDto(developer, fileOperationContexts, commitMessage);

        bool r = await _gitea.ModifyMultipleFiles(org, repository, dto, cancellationToken);
        if (r is false)
        {
            throw new InvalidOperationException("Failed to update code lists in Gitea.");
        }
    }

    internal static void ValidateCodeListTitles(List<CodeListWrapper> codeListWrappers)
    {
        if (codeListWrappers.Exists(clw => InputValidator.IsInvalidCodeListTitle(clw.Title)))
        {
            throw new IllegalFileNameException("One or more of the code list titles contains invalid characters. Latin characters, numbers and underscores are allowed.");
        }
    }

    internal static void ValidateCommitMessage(string? commitMessage)
    {
        if (string.IsNullOrWhiteSpace(commitMessage))
        {
            return;
        }
        if (InputValidator.IsValidGiteaCommitMessage(commitMessage) is false)
        {
            throw new IllegalCommitMessageException("The commit message is invalid. It must be between 1 and 5120 characters and not contain null characters.");
        }
    }

    internal static List<FileOperationContext> CreateFileOperationContexts(List<CodeListWrapper> localWrappers, List<FileSystemObject> remoteFiles)
    {
        (List<CodeListWrapper> remoteWrappers, Dictionary<string, string> fileMetadata) = ExtractContentFromFiles(remoteFiles);
        return GenerateFileOperationContexts(remoteWrappers, localWrappers, fileMetadata);
    }

    internal static (List<CodeListWrapper> remoteCodeListWrappers, Dictionary<string, string> fileMetadata) ExtractContentFromFiles(List<FileSystemObject> remoteFiles)
    {
        List<CodeListWrapper> remoteCodeListWrappers = [];
        Dictionary<string, string> fileMetadata = [];
        foreach (FileSystemObject file in remoteFiles)
        {
            string title = Path.GetFileNameWithoutExtension(file.Name);
            if (TryParseFile(file.Content, out CodeList? codeList))
            {
                remoteCodeListWrappers.Add(WrapCodeList(codeList, title, hasError: false));
            }
            else
            {
                remoteCodeListWrappers.Add(WrapCodeList(codeList, title, hasError: true));
            }
            fileMetadata[title] = file.Sha;
        }

        return (remoteCodeListWrappers, fileMetadata);
    }

    internal static FileOperationContext PrepareFile(string operation, CodeListWrapper codeListWrapper, string? sha = null)
    {
        switch (operation)
        {
            case FileOperation.Create when sha is not null:
                throw new ArgumentException("Create file operation requires sha to be null as file should not exist in Gitea.");
            case FileOperation.Update when sha is null:
                throw new ArgumentException("Update file operation requires sha.");
            case FileOperation.Delete when sha is null || codeListWrapper.CodeList is not null:
                throw new ArgumentException("Delete file operation requires sha, and empty code list.");
        }

        string? encodedContent = null;
        if (codeListWrapper.CodeList is not null)
        {
            string content = JsonSerializer.Serialize(codeListWrapper.CodeList, s_jsonOptions);
            encodedContent = Convert.ToBase64String(Encoding.UTF8.GetBytes(content));
        }

        return new FileOperationContext(
            Content: encodedContent,
            Operation: operation,
            Path: CodeListUtils.FilePath(codeListWrapper.Title),
            Sha: sha
        );
    }

    /// <inheritdoc />
    public async Task<List<OptionListData>> UploadCodeList(string org, string developer, IFormFile payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        string codeListId = Path.GetFileNameWithoutExtension(payload.FileName);

        List<Option>? deserializedCodeList = await JsonSerializer.DeserializeAsync<List<Option>>(payload.OpenReadStream(), s_jsonOptions, cancellationToken);

        bool codeListHasInvalidNullFields = deserializedCodeList is not null && deserializedCodeList.Exists(item => item.Value == null || item.Label == null);
        if (codeListHasInvalidNullFields)
        {
            throw new InvalidOptionsFormatException("Uploaded file is missing one of the following attributes for an option: value or label.");
        }

        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);
        await altinnOrgGitRepository.CreateCodeList(codeListId, deserializedCodeList, cancellationToken);

        List<OptionListData> codeLists = await GetCodeLists(org, developer, cancellationToken);
        return codeLists;
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

    private static void ValidateOption(Option option)
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
        return new CodeListWrapper(
            Title: title,
            CodeList: codeList,
            HasError: hasError
        );
    }

    private static GiteaMultipleFilesDto CreateGiteaMultipleFilesDto(string developer, List<FileOperationContext> fileOperationContexts, string? commitMessage, string? reference = null)
    {
        return new GiteaMultipleFilesDto(
            Author: new GiteaIdentity(Name: developer),
            Branch: string.IsNullOrWhiteSpace(reference) ? null : reference,
            Committer: new GiteaIdentity(Name: developer),
            Files: fileOperationContexts,
            Message: string.IsNullOrWhiteSpace(commitMessage) ? null : commitMessage
        );

    }

    private static List<FileOperationContext> GenerateFileOperationContexts(List<CodeListWrapper> remoteWrappers, List<CodeListWrapper> localWrappers, Dictionary<string, string> fileMetadata)
    {
        List<FileOperationContext> fileOperationContexts = [];

        HashSet<string> remoteWrapperTitles = remoteWrappers.Select(wrapper => wrapper.Title).ToHashSet();

        foreach (CodeListWrapper localWrapper in localWrappers)
        {
            if (remoteWrapperTitles.Contains(localWrapper.Title) is false)
            {
                fileOperationContexts.Add(PrepareFile(FileOperation.Create, localWrapper));
                continue;
            }

            foreach (CodeListWrapper remoteWrapper in remoteWrappers.Where(remoteWrapper => localWrapper.Title == remoteWrapper.Title))
            {
                string sha = fileMetadata[remoteWrapper.Title];
                if (localWrapper.CodeList is null)
                {
                    fileOperationContexts.Add(PrepareFile(FileOperation.Delete, localWrapper, sha));
                    break;
                }

                if (localWrapper.CodeList.Equals(remoteWrapper.CodeList) is false)
                {
                    fileOperationContexts.Add(PrepareFile(FileOperation.Update, localWrapper, sha));
                    break;
                }
            }
        }

        return fileOperationContexts;
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
            byte[] contentAsBytes = Convert.FromBase64String(fileContent);
            string decodedContent = Encoding.UTF8.GetString(contentAsBytes);
            codeList = JsonSerializer.Deserialize<CodeList>(decodedContent, s_jsonOptions);
            return codeList is not null;
        }
        catch (Exception ex) when (ex is ValidationException or JsonException or ArgumentNullException or FormatException)
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
