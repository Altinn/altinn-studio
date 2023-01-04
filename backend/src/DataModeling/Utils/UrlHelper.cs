using System;
using System.IO;

namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// Class for convenience methods for working on url's.
    /// </summary>
    public static class UrlHelper
    {
        /// <summary>
        /// Gets the name part of the url ie. the last segment but without any file extension.
        /// Accepts both relative and absolute url's. Trailing slash will be removed.
        /// </summary>
        public static string GetName(string url)
        {
            if (url.EndsWith("/"))
            {
                url = url[0..^1];
            }

            // dummyBase is just to make sure we have an absolute uri to work on
            // as the uri.LocalPath property doesn't work on relative url's.
            string dummyBase = "https://dummybase";
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            {
                uri = new Uri(new Uri(dummyBase), url);
            }                

            return Path.GetFileNameWithoutExtension(uri.LocalPath);
        }
    }
}
