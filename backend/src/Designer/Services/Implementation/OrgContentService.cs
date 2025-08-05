using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <inheritdoc />
public class OrgContentService : IOrgContentService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IGiteaContentLibraryService _giteaContentLibraryService;

    public OrgContentService(
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IGiteaContentLibraryService giteaContentLibraryService)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _giteaContentLibraryService = giteaContentLibraryService;
    }

    /// <inheritdoc />
    public bool OrgContentRepoExists(AltinnOrgContext context)
    {
        string contentRepoName = GetContentRepoName(context.Org);
        string repoPath = _altinnGitRepositoryFactory.GetRepositoryPath(context.Org, contentRepoName, context.DeveloperName);
        return Directory.Exists(repoPath);
    }

    /// <inheritdoc />
    public async Task<List<LibraryContentReference>> GetOrgContentReferences(LibraryContentType? contentType, AltinnOrgContext context)
    {
        switch (contentType)
        {
            case LibraryContentType.CodeList:
                return await GetCodeListReferences(context);

            case LibraryContentType.TextResource:
                return await GetTextResourceReferences(context);

            case null:
                return await GetAllReferences(context);

            default:
                return [];
        }
    }

    private async Task<List<LibraryContentReference>> GetAllReferences(AltinnOrgContext context)
    {
        var codeListContent = GetCodeListReferences(context);
        var textContent = GetTextResourceReferences(context);

        var result = new List<LibraryContentReference>();
        result.AddRange(await codeListContent);
        result.AddRange(await textContent);
        return result;
    }

    private async Task<List<LibraryContentReference>> GetCodeListReferences(AltinnOrgContext context)
    {
        List<string> codeListIds = await _giteaContentLibraryService.GetCodeListIds(context.Org);
        return CreateContentReferences(LibraryContentType.CodeList, codeListIds, context.Org);
    }

    private async Task<List<LibraryContentReference>> GetTextResourceReferences(AltinnOrgContext context)
    {
        List<string> textIds = await _giteaContentLibraryService.GetTextIds(context.Org);
        return CreateContentReferences(LibraryContentType.TextResource, textIds, context.Org);
    }

    private static List<LibraryContentReference> CreateContentReferences(LibraryContentType contentType, List<string> contentIds, string orgName)
    {
        return contentIds.Select(contentId => new LibraryContentReference
        {
            Id = contentId,
            Type = contentType,
            Source = FormatContentSource(orgName)
        }).ToList();
    }

    private static string FormatContentSource(string orgName) => $"org.{orgName}";

    private static string GetContentRepoName(string org)
    {
        return $"{org}-content";
    }
}
