using System;
using System.Linq;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Common.Helpers
{
    /// <summary>
    /// Helper class for setting application self links
    /// </summary>
    public static class SelfLinkHelper
    {
        private static string[] testDomains = { "altinn3local.no", "local.altinn.cloud" };

        private static string GetSafeScheme(HttpRequest request)
        {
            if (testDomains.Contains(request.Host.Host))
            {
                return request.Scheme;
            }

            // return https for all non-whitelisted domains
            return "https";
        }

        /// <summary>
        /// Sets the application specific self links.
        /// </summary>
        /// <param name="instance">the instance to set links for</param>
        /// <param name="request">the http request to extract host and path name</param>
        public static void SetInstanceAppSelfLinks(Instance instance, HttpRequest request)
        {
            string host = $"{GetSafeScheme(request)}://{request.Host.ToUriComponent()}";
            string url = request.Path;

            string selfLink = $"{host}{url}";

            int start = selfLink.IndexOf("/instances");
            if (start > 0)
            {
                selfLink = selfLink.Substring(0, start) + "/instances";
            }

            selfLink += $"/{instance.Id}";

            if (!selfLink.EndsWith(instance.Id))
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
        public static void SetDataAppSelfLinks(int instanceOwnerPartyId, Guid instanceGuid, DataElement dataElement, HttpRequest request)
        {
            string host = $"{GetSafeScheme(request)}://{request.Host.ToUriComponent()}";
            string url = request.Path;

            string selfLink = $"{host}{url}";

            int start = selfLink.IndexOf("/instances");
            if (start > 0)
            {
                selfLink = selfLink.Substring(0, start) + "/instances";
            }

            selfLink += $"/{instanceOwnerPartyId}/{instanceGuid.ToString()}";

            dataElement.SelfLinks ??= new ResourceLinks();

            dataElement.SelfLinks.Apps = $"{selfLink}/data/{dataElement.Id}";
        }
    }
}
