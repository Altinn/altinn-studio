using Altinn.App.Api.Tests.Mocks;
using System;
using System.IO;

namespace Altinn.App.Api.Tests.Data
{
    public static class TestData
    {
        public static string GetTestDataRootFolder()
        {
            var assemblyPath = new Uri(typeof(TestData).Assembly.Location).LocalPath;

            return Path.Combine(assemblyPath, @".././../Data");
        }

        public static string GetTestDataInstancesFolder()
        {
            string? testDataFolder = Path.GetDirectoryName(TestData.GetTestDataRootFolder());

            return Path.Combine(testDataFolder!, @"Instances");
        }

        public static string GetTestDataRolesFolder(int userId, int resourcePartyId)
        {
            string? testDataFolder = GetTestDataRootFolder();
            return Path.Combine(testDataFolder, @"authorization/Roles/User_" + userId.ToString(), "party_" + resourcePartyId, "roles.json");
        }

        public static string GetAltinnAppsPolicyPath(string org, string app)
        {
            string testDataFolder = GetTestDataRootFolder();
            return Path.Combine(testDataFolder, "apps", org, app, "config", "authorization") + Path.DirectorySeparatorChar;
        }
    }
}
