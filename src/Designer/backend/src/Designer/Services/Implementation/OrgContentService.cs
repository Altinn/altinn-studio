using System.Collections.Generic;
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

    private readonly IGiteaContentLibraryService _giteaContentLibraryService;

    public OrgContentService(IGiteaContentLibraryService giteaContentLibraryService)
    {
        _giteaContentLibraryService = giteaContentLibraryService;
    }

    /// <inheritdoc />
    public async Task<bool> OrgContentRepoExists(AltinnOrgContext context)
    {
        return await _giteaContentLibraryService.OrgContentRepoExists(context.Org);
    }

    /// <inheritdoc />
    public async Task<List<LibraryContentReference>> GetOrgContentReferences(LibraryContentType? contentType, string orgName)
    {
        switch (contentType)
        {
            case LibraryContentType.CodeList:
                return await GetCodeListReferences(orgName);

            case LibraryContentType.TextResource:
                return await GetTextResourceReferences(orgName);

            case null:
                return await GetAllReferences(orgName);

            default:
                return [];
        }
    }

    private async Task<List<LibraryContentReference>> GetAllReferences(string orgName)
    {
        var codeListContent = GetCodeListReferences(orgName);
        var textContent = GetTextResourceReferences(orgName);

        var result = new List<LibraryContentReference>();
        result.AddRange(await codeListContent);
        result.AddRange(await textContent);
        return result;
    }

    private async Task<List<LibraryContentReference>> GetCodeListReferences(string orgName)
    {
        List<string> codeListIds = await _giteaContentLibraryService.GetCodeListIds(orgName);
        return CreateContentReferences(LibraryContentType.CodeList, codeListIds, orgName);
    }

    private async Task<List<LibraryContentReference>> GetTextResourceReferences(string orgName)
    {
        List<string> textIds = await _giteaContentLibraryService.GetTextIds(orgName);
        return CreateContentReferences(LibraryContentType.TextResource, textIds, orgName);
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
}
