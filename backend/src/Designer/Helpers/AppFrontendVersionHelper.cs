using System;
using System.IO;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Designer.Helpers;

public static class AppFrontendVersionHelper
{
    private const string SemanticVersionRegex = @"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$";
    private const string ExtendedVersion = @"^(\d+)(\.\d+)?$";

    public static bool TryGetFrontendVersionFromIndexFile(string filePath, out string version)
    {
        version = null;

        string fileContent = File.ReadAllText(filePath);
        var htmlDoc = new HtmlAgilityPack.HtmlDocument();
        htmlDoc.LoadHtml(fileContent);
        var scriptTag = htmlDoc.DocumentNode.SelectSingleNode(
            "//script[contains(@src, 'https://altinncdn.no/toolkits/altinn-app-frontend') and contains(@src, 'altinn-app-frontend.js')]");


        string srcAttribute = scriptTag?.GetAttributeValue("src", null);

        if (srcAttribute is null)
        {
            return false;
        }

        const string prefix = "https://altinncdn.no/toolkits/altinn-app-frontend/";
        const string suffix = "/altinn-app-frontend.js";

        int prefixIndex = srcAttribute.IndexOf(prefix, StringComparison.Ordinal);
        int suffixIndex = srcAttribute.IndexOf(suffix, StringComparison.Ordinal);

        if (prefixIndex == -1 || suffixIndex == -1)
        {
            return false;
        }

        int startIndex = prefixIndex + prefix.Length;
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
