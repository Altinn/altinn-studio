using System.Text;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Helper class for setting application self links
/// </summary>
public static class SelfLinkHelper
{
    /// <summary>
    /// Sets the application specific self links.
    /// </summary>
    /// <param name="instance">the instance to set links for</param>
    /// <param name="request">the http request to extract host and path name</param>
    public static void SetInstanceAppSelfLinks(Instance instance, HttpRequest request)
    {
        string host = $"https://{request.Host.ToUriComponent()}";
        string url = request.Path;

        string selfLink = $"{host}{url}";

        int start = selfLink.IndexOf("/instances", StringComparison.OrdinalIgnoreCase);
        if (start > 0)
        {
            selfLink = string.Concat(selfLink.AsSpan(0, start), "/instances");
        }

        selfLink += $"/{instance.Id}";

        if (!selfLink.EndsWith(instance.Id, StringComparison.OrdinalIgnoreCase))
        {
            selfLink += instance.Id;
        }

        instance.SelfLinks ??= new ResourceLinks();
        instance.SelfLinks.Apps = selfLink;

        if (instance.Data != null)
        {
            foreach (DataElement dataElement in instance.Data)
            {
                dataElement.SelfLinks ??= new ResourceLinks();
                dataElement.SelfLinks.Apps = $"{selfLink}/data/{dataElement.Id}";
            }
        }
    }

    /// <summary>
    /// Sets the application specific self links.
    /// </summary>
    /// <param name="instanceOwnerPartyId">the instance owner</param>
    /// <param name="instanceGuid">the instance guid for the instance the data element belongs to</param>
    /// <param name="dataElement">the data element to set links for</param>
    /// <param name="request">the http request to extract host and path name</param>
    public static void SetDataAppSelfLinks(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        DataElement dataElement,
        HttpRequest request
    )
    {
        string host = $"https://{request.Host.ToUriComponent()}";
        string url = request.Path;

        string selfLink = $"{host}{url}";

        int start = selfLink.IndexOf("/instances", StringComparison.OrdinalIgnoreCase);
        if (start > 0)
        {
            selfLink = string.Concat(selfLink.AsSpan(0, start), "/instances");
        }

        selfLink += $"/{instanceOwnerPartyId}/{instanceGuid.ToString()}";

        dataElement.SelfLinks ??= new ResourceLinks();

        dataElement.SelfLinks.Apps = $"{selfLink}/data/{dataElement.Id}";
    }

    /// <summary>
    /// Build a url that can be opened in a browser
    /// </summary>
    /// <param name="instance">The instance metadata document.</param>
    /// <param name="request">The original http request.</param>
    /// <returns></returns>
    public static string BuildFrontendSelfLink(Instance instance, HttpRequest request)
    {
        StringBuilder urlBuilder = new($"https://{request.Host.ToUriComponent()}/");
        urlBuilder.Append(instance.AppId);
        urlBuilder.Append("/#/instance/");
        urlBuilder.Append(instance.Id);

        return urlBuilder.ToString();
    }
}
