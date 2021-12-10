using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// Link Header
    /// </summary>
    public class LinkHeader
    {
        /// <summary>
        /// Link to first page in search
        /// </summary>
        public string FirstLink { get; set; }

        /// <summary>
        /// Link to previous page in search
        /// </summary>
        public string PrevLink { get; set; }

        /// <summary>
        /// Link to next page in search
        /// </summary>
        public string NextLink { get; set; }

        /// <summary>
        /// Link to last page in search
        /// </summary>
        public string LastLink { get; set; }

        /// <summary>
        /// Parse links from headerstring
        /// </summary>
        /// <param name="linkHeaderStr">link-string from header</param>
        /// <returns></returns>
        public static LinkHeader LinksFromHeader(string linkHeaderStr)
        {
            LinkHeader linkHeader = null;

            if (!string.IsNullOrWhiteSpace(linkHeaderStr))
            {
                string[] linkStrings = linkHeaderStr.Split(',');

                if (linkStrings != null && linkStrings.Any())
                {
                    linkHeader = new LinkHeader();

                    foreach (string linkString in linkStrings)
                    {
                        var relMatch = Regex.Match(linkString, "(?<=rel=\").+?(?=\")", RegexOptions.IgnoreCase);
                        var linkMatch = Regex.Match(linkString, "(?<=<).+?(?=>)", RegexOptions.IgnoreCase);

                        if (relMatch.Success && linkMatch.Success)
                        {
                            string rel = relMatch.Value.ToUpper();
                            string link = linkMatch.Value;

                            switch (rel)
                            {
                                case "FIRST":
                                    linkHeader.FirstLink = link;
                                    break;
                                case "PREV":
                                    linkHeader.PrevLink = link;
                                    break;
                                case "NEXT":
                                    linkHeader.NextLink = link;
                                    break;
                                case "LAST":
                                    linkHeader.LastLink = link;
                                    break;
                            }
                        }
                    }
                }
            }

            return linkHeader;
        }
    }
}
