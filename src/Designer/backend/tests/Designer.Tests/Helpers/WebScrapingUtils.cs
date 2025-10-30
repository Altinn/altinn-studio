#nullable disable
using System;

namespace Designer.Tests.Helpers;

public static class WebScrapingUtils
{
    /// <summary>
    /// Find the value of a form input element in an HTML content based on the search strings.
    /// </summary>
    /// <param name="htmlContent">The HTML content from which the substring will be extracted.</param>
    /// <param name="beforeText">The text that appears immediately before the desired substring. If there are multiple matches, only first will be considered.</param>
    /// <param name="afterText">The text that appears immediately after the desired substring.</param>
    /// <returns>The extracted substring between "beforeText" and "afterText" if they are found in the HTML content and are in the correct order.
    /// Returns null if the conditions are not met.
    /// </returns>
    public static string ExtractTextBetweenMarkers(string htmlContent, string beforeText, string afterText)
    {
        int start = htmlContent.IndexOf(beforeText, StringComparison.InvariantCulture);
        if (start == -1)
        {
            return null;
        }

        // Adjust the start index to the end of 'inputSearchTextBefore'
        start += beforeText.Length;

        // Find the ending index of the text before the 'inputSearchTextAfter' marker
        int stop = htmlContent.IndexOf(afterText, start, StringComparison.InvariantCulture);
        if (stop == -1)
        {
            return null;
        }

        if (stop > start)
        {
            // Extract and return the substring between the start and stop indices
            return htmlContent.Substring(start, stop - start);
        }

        return null;
    }
}
