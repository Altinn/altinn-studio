using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <inheritdoc />
public class OrgContentService : IOrgContentService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IOrgCodeListService _orgCodeListService;
    private readonly IOrgTextsService _orgTextsService;

    public OrgContentService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IOrgCodeListService orgCodeListService, IOrgTextsService orgTextsService)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _orgCodeListService = orgCodeListService;
        _orgTextsService = orgTextsService;
    }

    /// <inheritdoc />
    public bool OrgContentRepoExists(AltinnOrgContext context)
    {
        string contentRepoName = GetContentRepoName(context.Org);
        string repoPath = _altinnGitRepositoryFactory.GetRepositoryPath(context.Org, contentRepoName, context.DeveloperName);
        try
        {
            Guard.AssertDirectoryExists(repoPath);
            return true;
        }
        catch (DirectoryNotFoundException)
        {
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<List<LibraryContentReference>> GetOrgContentReferences(LibraryContentType? contentType, AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        switch (contentType)
        {
            case LibraryContentType.CodeList:
                return GetCodeListReferences(context, cancellationToken);

            case LibraryContentType.TextResource:
                return await GetTextResourceReferences(context, cancellationToken);

            case null:
                return await GetAllReferences(context, cancellationToken);

            default:
                return [];
        }
    }

    private async Task<List<LibraryContentReference>> GetAllReferences(AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        var codeListContent = GetCodeListReferences(context, cancellationToken);
        var textContent = await GetTextResourceReferences(context, cancellationToken);

        var result = new List<LibraryContentReference>();
        result.AddRange(codeListContent);
        result.AddRange(textContent);
        return result;
    }

    private List<LibraryContentReference> GetCodeListReferences(AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
            List<string> codeListIds = _orgCodeListService.GetCodeListIds(context.Org, context.DeveloperName, cancellationToken);
            return CreateContentReferences(LibraryContentType.CodeList, codeListIds, context.Org);
    }

    private async Task<List<LibraryContentReference>> GetTextResourceReferences(AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
            List<string> textIds = await _orgTextsService.GetTextIds(context.Org, context.DeveloperName, cancellationToken);
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
