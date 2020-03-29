using System;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;

namespace Altinn.App.PlatformServices.Helpers
{
    public static class RequestHelper
    {
        public static string GetCompliantContentHeader(string headerValues)
        {
            // Encode filname if not previously encoded.
            StringBuilder bld = new StringBuilder();
            string keyWord = "filename=";
            int splitIndex = headerValues.IndexOf(keyWord) + keyWord.Length;

            // Add everything up to 'filename='
            bld.Append(headerValues.Substring(0, splitIndex));

            //find position of the filename
            string remainder = headerValues.Substring(splitIndex);
            int endIndex = remainder.IndexOf(';');

            // if filename isn't the last parameter the string must be split and then rest appended later
            if (endIndex > 0)
            {
                string fileName = remainder.Substring(0, endIndex);

                if (fileName.Equals(HttpUtility.UrlDecode(fileName)))
                {
                    fileName =Uri.EscapeUriString(fileName);
                }

                bld.Append(fileName);
                bld.Append(remainder.Substring(endIndex));
            }
            else
            {
                if (remainder.Equals(HttpUtility.UrlDecode(remainder, Encoding.UTF8)))
                {
                    remainder = Uri.EscapeUriString(remainder);
                }

                bld.Append(remainder);
            }

            return bld.ToString();
        }
    }
}
