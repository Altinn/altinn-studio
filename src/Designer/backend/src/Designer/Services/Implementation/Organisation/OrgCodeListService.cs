#nullable enable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Constants;
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
    private readonly ISourceControl _sourceControl;
    private readonly ISharedContentClient _sharedContentClient;

    private const string DefaultCommitMessage = "Update code lists.";
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
    /// <param name="sourceControl">the source control</param>
    /// <param name="sharedContentClient">the shared content client</param>
    public OrgCodeListService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IGitea gitea, ISourceControl sourceControl, ISharedContentClient sharedContentClient)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _gitea = gitea;
        _sourceControl = sourceControl;
        _sharedContentClient = sharedContentClient;
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
    public async Task<GetCodeListResponse> GetCodeListsNew(string org, string? reference = null, CancellationToken cancellationToken = default)
    {
        string repository = GetStaticContentRepo(org);
        List<FileSystemObject> files = await _gitea.GetCodeListDirectoryContentAsync(org, repository, reference, cancellationToken);
        string latestCommitSha = await _gitea.GetLatestCommitOnBranch(org, repository, reference, cancellationToken);

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
        GetCodeListResponse response = new(codeListWrappers, latestCommitSha);
        return response;
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
    public async Task UpdateCodeListsNew(string org, string developer, UpdateCodeListRequest request, CancellationToken cancellationToken = default)
    {
        ValidateCodeListTitles(request.CodeListWrappers);
        ValidateCommitMessage(request.CommitMessage);
        string repositoryName = GetStaticContentRepo(org);

        await _sourceControl.CloneIfNotExists(org, repositoryName);
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repositoryName, developer);

        string latestCommitSha = await _gitea.GetLatestCommitOnBranch(org, repositoryName, General.DefaultBranch, cancellationToken);
        if (latestCommitSha == request.BaseCommitSha)
        {
            await HandleCommit(editingContext, request, cancellationToken);
        }
        else
        {
            await HandleDivergentCommit(editingContext, request, cancellationToken);
        }
        bool pushOk = await _sourceControl.Push(org, repositoryName);
        if (!pushOk)
        {
            throw new InvalidOperationException($"Push failed for {org}/{repositoryName}. Remote rejected the update.");
        }
    }

    internal async Task HandleCommit(AltinnRepoEditingContext editingContext, UpdateCodeListRequest request, CancellationToken cancellationToken = default)
    {
        _sourceControl.CheckoutRepoOnBranch(editingContext, General.DefaultBranch);
        foreach (CodeListWrapper wrapper in request.CodeListWrappers)
        {
            await UpdateCodeListFile(editingContext.Org, editingContext.Developer, wrapper.Title, wrapper.CodeList, cancellationToken);
        }
        _sourceControl.CommitToLocalRepo(editingContext, request.CommitMessage ?? DefaultCommitMessage);
    }

    internal async Task HandleDivergentCommit(AltinnRepoEditingContext editingContext, UpdateCodeListRequest request, CancellationToken cancellationToken = default)
    {
        string branchName = editingContext.Developer;
        _sourceControl.DeleteLocalBranchIfExists(editingContext, branchName);
        _sourceControl.CreateLocalBranch(editingContext, branchName, request.BaseCommitSha);
        _sourceControl.CheckoutRepoOnBranch(editingContext, branchName);

        foreach (CodeListWrapper wrapper in request.CodeListWrappers)
        {
            await UpdateCodeListFile(editingContext.Org, editingContext.Developer, wrapper.Title, wrapper.CodeList, cancellationToken);
        }

        _sourceControl.CommitToLocalRepo(editingContext, request.CommitMessage ?? DefaultCommitMessage);
        _sourceControl.RebaseOntoDefaultBranch(editingContext);
        _sourceControl.CheckoutRepoOnBranch(editingContext, General.DefaultBranch);
        _sourceControl.MergeBranchIntoHead(editingContext, branchName);
        _sourceControl.DeleteLocalBranchIfExists(editingContext, branchName);
    }

    internal async Task UpdateCodeListFile(string org, string developer, string codeListId, CodeList? codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnOrgGitRepository altinnOrgGitRepository = _altinnGitRepositoryFactory.GetAltinnOrgGitRepository(org, repo, developer);

        await altinnOrgGitRepository.UpdateCodeListNew(codeListId, codeList, cancellationToken);
    }

    internal static void ValidateCodeListTitles(List<CodeListWrapper> codeListWrappers)
    {
        if (codeListWrappers.Exists(clw => InputValidator.IsInvalidCodeListTitle(clw.Title)))
        {
            throw new IllegalFileNameException("One or more code list titles contains invalid characters. Allowed: letters, numbers, underscores (_), hyphens (-), and dots (.)");
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

    /// <inheritdoc />
    public async Task<List<OptionListData>> UploadCodeList(string org, string developer, IFormFile payload, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        string codeListId = Path.GetFileNameWithoutExtension(payload.FileName);

        List<Option>? deserializedCodeList = await JsonSerializer.DeserializeAsync<List<Option>>(payload.OpenReadStream(), s_jsonOptions, cancellationToken);

        bool codeListHasInvalidNullFields = deserializedCodeList is not null && deserializedCodeList.Exists(item => item.Value == null || item.Label == null);
        if (deserializedCodeList is null || codeListHasInvalidNullFields)
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

    public async Task PublishCodeList(string org, PublishCodeListRequest request, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListId = request.Title;
        CodeList codeList = request.CodeList;

        await _sharedContentClient.PublishCodeList(org, codeListId, codeList, cancellationToken);
    }

    public async Task PublishCodeListThisExistsOnlyForTesting(string org, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        const string CodeListId = "someNewCodeList";
        Dictionary<string, string> label = new() { { "nb", "tekst" }, { "en", "text" } };
        Dictionary<string, string> description = new() { { "nb", "Dette er en tekst" }, { "en", "This is a text" } };
        Dictionary<string, string> helpText = new() { { "nb", "Velg dette valget for å få en tekst" }, { "en", "Choose this option to get a text" } };
        List<Code> listOfCodes =
        [
            new(
                Value: "value1",
                Label: label,
                Description: description,
                HelpText: helpText,
                Tags: ["test-data"]
            )
        ];
        CodeListSource source = new(Name: "test-data-files");
        CodeList codeList = new(
            Source: source,
            Codes: listOfCodes,
            TagNames: ["test-data-category"]
        );

        PublishCodeListRequest request = new(Title: CodeListId, CodeList: codeList);

        await PublishCodeList(org, request, cancellationToken);
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
