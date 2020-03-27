using System.Text;
using System.Text.RegularExpressions;

namespace Altinn.App.PlatformServices.Helpers
{
    public static class RequestHelper
    {
        public static string GetCompliantContentHeader(string headerValues)
        {
            // Remove all spaces from filename
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
                bld.Append(Regex.Replace(fileName, @"\s+", "_"));
                bld.Append(remainder.Substring(endIndex));
            }
            else
            {
                bld.Append(Regex.Replace(remainder, @"\s+", "_"));
            }

            return bld.ToString();
        }
    }
}
