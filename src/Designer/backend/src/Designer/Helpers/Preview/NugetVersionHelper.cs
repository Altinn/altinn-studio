using System;
using System.Diagnostics.Contracts;
using System.Linq;

namespace Altinn.Studio.Designer.Helpers.Preview
{
    public static class NugetVersionHelper
    {
        private const string MINIMUM_NUGET_VERSION = "8.0.0.0";
        private const int MINIMUM_PREVIEW_NUGET_VERSION = 15;

        /// <summary>
        /// Method to get the mocked altinn nuget build from the version
        /// We are returnning the minimum BUILD version of the nuget package that is required for app frontend to work
        /// from v4 and above.
        /// </summary>
        /// <param name="version">The version of the nuget package</param>
        /// <returns>The minimum build version of the nuget package</returns>
        public static string GetMockedAltinnNugetBuildFromVersion(string version)
        {

            string[] versionParts = version.Split('.');
            if (!IsValidSemVerVersion(versionParts))
            {
                return string.Empty;
            }

            string normalVersion = version.Split('-').First();
            int[] numberVersion = [.. normalVersion.Split('.').Take(3).Select((split) => Convert.ToInt32(split))];
            if (IsVersionOrBelow(numberVersion, [8, 0, 0]) && IsPreviewVersion(versionParts) && GetPreviewVersion(versionParts) < MINIMUM_PREVIEW_NUGET_VERSION)
            {
                return string.Empty;
            }

            return MINIMUM_NUGET_VERSION;
        }

        private static bool IsValidSemVerVersion(string[] versionParts)
        {
            return versionParts.Length >= 3 && Convert.ToInt32(versionParts[0]) >= 8;
        }

        // <exception cref="FormatException"></exception>
        // <exception cref="OverflowException"></exception>
        private static bool IsVersionOrBelow(int[] versionParts, int[] breakpoint)
        {
            Contract.Requires(versionParts.Length == 3);
            Contract.Requires(breakpoint.Length == 3);
            for (int i = 0; i < 3; i++)
            {
                if (versionParts[i] > breakpoint[i])
                {
                    return false;
                }
            }
            return true;
        }

        private static bool IsPreviewVersion(string[] versionParts)
        {
            return versionParts[2].Contains("-preview") && versionParts.Length == 4;
        }

        private static int GetPreviewVersion(string[] versionParts)
        {
            return Convert.ToInt32(versionParts[3]);
        }
    }
}
