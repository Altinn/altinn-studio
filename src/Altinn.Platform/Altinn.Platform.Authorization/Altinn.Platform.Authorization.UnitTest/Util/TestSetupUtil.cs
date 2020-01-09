using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Storage.Interface.Models;
using Authorization.Platform.Authorization.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;

namespace Altinn.Platform.Authorization.UnitTest.Util
{
    public static class TestSetupUtil
    {
              
        public static XacmlContextRequest CreateXacmlContextRequest(string testCase)
        {
            return XacmlTestDataParser.ParseRequest(testCase + "Request.xml", GetAltinnAppsPath());
        }

        public static XacmlContextRequest GetEnrichedRequest(string testCase)
        {
            return XacmlTestDataParser.ParseRequest(testCase + "EnrichedRequest.xml", GetAltinnAppsPath());
        }

        public static Instance GetInstanceData(string instanceFileName)
        {
            string filePath = Path.Combine(GetInstancePath(), instanceFileName);
            string instanceData = File.ReadAllText(filePath);
            Instance instance = JsonConvert.DeserializeObject<Instance>(instanceData);
            return instance;
        }

        public static List<Role> GetRoles(int userId, int resourcePartyId)
        {
            string rolesPath = GetRolesPath(userId, resourcePartyId);

            List<Role> roles = new List<Role>();

            if (File.Exists(rolesPath))
            {
                string content = System.IO.File.ReadAllText(rolesPath);
                roles = (List<Role>)JsonConvert.DeserializeObject(content, typeof(List<Role>));
            }
            return roles;
        }

        private static string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ContextHandlerTest).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\AltinnApps");
        }

        private static string GetRolesPath(int userId, int resourcePartyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ContextHandlerTest).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Roles\User_" + userId + @"\party_" + resourcePartyId + @"\roles.json");
        }

        private static string GetInstancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ContextHandlerTest).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances");
        }
    }
}
