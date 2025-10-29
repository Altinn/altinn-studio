#nullable disable
using System;
using System.IO;
using System.Text.RegularExpressions;
using HtmlAgilityPack;

namespace Altinn.Studio.Designer.Helpers;

public static class AppFrontendVersionHelper
{
    private const string SemanticVersionRegex = @"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$";
    private const string ExtendedVersion = @"^(\d+)(\.\d+)?$";

    // allow overwriting altinn-app-frontend version with a meta tag
    // i.e. <meta data-altinn-app-frontend-version="4" />
    private static string GetMetaTagVersion(HtmlDocument htmlDoc)
    {
        HtmlNode metaTag = htmlDoc.DocumentNode.SelectSingleNode("//meta[@data-altinn-app-frontend-version]");
        return metaTag?.GetAttributeValue("data-altinn-app-frontend-version", null);
    }

    public static bool TryGetFrontendVersionFromIndexFile(string filePath, out string version)
    {
        version = null;

        string fileContent = File.ReadAllText(filePath);
        var htmlDoc = new HtmlDocument();
        htmlDoc.LoadHtml(fileContent);

        string metaTagVersion = GetMetaTagVersion(htmlDoc);
        if (metaTagVersion != null)
        {
            version = metaTagVersion;
            return true;
        }

        var scriptTag = htmlDoc.DocumentNode.SelectSingleNode(
            "//script[contains(@src, 'https://altinncdn.no/toolkits/altinn-app-frontend') and contains(@src, 'altinn-app-frontend.js')]");


        string srcAttribute = scriptTag?.GetAttributeValue("src", null);

        if (srcAttribute is null)
        {
            return false;
        }

        const string Prefix = "https://altinncdn.no/toolkits/altinn-app-frontend/";
        const string Suffix = "/altinn-app-frontend.js";

        int prefixIndex = srcAttribute.IndexOf(Prefix, StringComparison.Ordinal);
        int suffixIndex = srcAttribute.IndexOf(Suffix, StringComparison.Ordinal);

        if (prefixIndex == -1 || suffixIndex == -1 || prefixIndex >= suffixIndex)
        {
            return false;
        }

        int startIndex = prefixIndex + Prefix.Length;
        int endIndex = suffixIndex;

        string foundVersion = srcAttribute.Substring(startIndex, endIndex - startIndex);

        if (!Regex.IsMatch(foundVersion, SemanticVersionRegex) && !Regex.IsMatch(foundVersion, ExtendedVersion))
        {
            return false;
        }

        version = foundVersion;
        return true;

    }
}
