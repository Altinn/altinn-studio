using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;

namespace Altinn.Studio.Designer.Services.Implementation;

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
    public async Task<List<ExternalContentLibraryResource>> GetResourceList(LibraryContentType? type, AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        if (type == null) return await GetCombinedResourceList(context, cancellationToken);

        switch (type)
        {
            case LibraryContentType.CodeList:
                return GetCodeListResourceList(context, cancellationToken);

            case LibraryContentType.TextResource:
                return await GetTextResourceList(context, cancellationToken);

            default:
                return [];
        }
    }

    private async Task<List<ExternalContentLibraryResource>> GetCombinedResourceList(AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        var codeListResourceList = GetCodeListResourceList(context, cancellationToken);
        var textResourceList = await GetTextResourceList(context, cancellationToken);

        var result = new List<ExternalContentLibraryResource>(codeListResourceList.Count + textResourceList.Count);
        result.AddRange(codeListResourceList);
        result.AddRange(textResourceList);
        return result;
    }

    private List<ExternalContentLibraryResource> GetCodeListResourceList(AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        List<string> codeListIds = _orgCodeListService.GetCodeListIds(context.Org, context.DeveloperName, cancellationToken);
        return CreateResourceList(LibraryContentType.CodeList, codeListIds, context.Org);
    }

    private async Task<List<ExternalContentLibraryResource>> GetTextResourceList(AltinnOrgContext context, CancellationToken cancellationToken = default)
    {
        List<string> textIds = await _orgTextsService.GetTextIds(context.Org, context.DeveloperName, cancellationToken);
        return CreateResourceList(LibraryContentType.TextResource, textIds, context.Org);
    }

    private static List<ExternalContentLibraryResource> CreateResourceList(LibraryContentType type, List<string> ids, string orgName)
    {
        var resourceList = new List<ExternalContentLibraryResource>();
        foreach (string id in ids)
        {
            var newResource = new ExternalContentLibraryResource
            {
                Source = ContentSource(orgName),
                Type = type,
                Id = id
            };
            resourceList.Add(newResource);
        }

        return resourceList;
    }

    private static string ContentSource(string orgName) => $"org.{orgName}";
}
