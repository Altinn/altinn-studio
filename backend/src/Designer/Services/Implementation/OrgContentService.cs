using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <inheritdoc />
public class OrgContentService : IOrgContentService
{
    private readonly IOrgCodeListService _orgCodeListService;
    private readonly IOrgTextsService _orgTextsService;

    public OrgContentService(IOrgCodeListService orgCodeListService, IOrgTextsService orgTextsService)
    {
        _orgCodeListService = orgCodeListService;
        _orgTextsService = orgTextsService;
    }

    /// <inheritdoc />
    public async Task<List<LibraryContentReference>> GetContentList(LibraryContentType contentType, AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        switch (contentType)
        {
            case LibraryContentType.CodeList:
                return GetCodeListContentList(context, cancellationToken);

            case LibraryContentType.TextResource:
                return await GetTextContentList(context, cancellationToken);

            default:
                return [];
        }
    }

    private List<LibraryContentReference> GetCodeListContentList(AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        List<string> codeListIds = _orgCodeListService.GetCodeListIds(context.Org, context.DeveloperName, cancellationToken);
        return CreateContentList(LibraryContentType.CodeList, codeListIds, context.Org);
    }

    private async Task<List<LibraryContentReference>> GetTextContentList(AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        List<string> textIds = await _orgTextsService.GetTextIds(context.Org, context.DeveloperName, cancellationToken);
        return CreateContentList(LibraryContentType.TextResource, textIds, context.Org);
    }

    private static List<LibraryContentReference> CreateContentList(LibraryContentType contentType, List<string> contentIds, string orgName)
    {
        var resourceList = new List<LibraryContentReference>();
        foreach (string contentId in contentIds)
        {
            var newResource = new LibraryContentReference
            {
                Id = contentId,
                Type = contentType,
                Source = FormatContentSource(orgName)
            };
            resourceList.Add(newResource);
        }

        return resourceList;
    }

    private static string FormatContentSource(string orgName) => $"org.{orgName}";
}
