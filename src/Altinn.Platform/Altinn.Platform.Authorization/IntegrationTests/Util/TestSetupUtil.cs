using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Storage.Interface.Models;

using Authorization.Platform.Authorization.Models;

using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.IntegrationTests.Util
{
    public static class TestSetupUtil
    {
        public static HttpRequestMessage CreateXacmlRequest(string testcase)
        {
            XmlDocument policyDocument = new XmlDocument();

            if (testcase.Contains("AltinnApps"))
            {
                policyDocument.Load(Path.Combine(GetAltinnAppsPath(), testcase + "Request.xml"));
            }
            else
            {
                policyDocument.Load(Path.Combine(GetConformancePath(), testcase + "Request.xml"));
            }

            HttpRequestMessage message = new HttpRequestMessage(HttpMethod.Post, "authorization/api/v1/Decision")
            {
                Content = new StringContent(policyDocument.OuterXml, Encoding.UTF8, "application/xml")
            };
            message.Headers.Add("testcase", testcase);

            return message;
        }

        public static HttpRequestMessage CreateJsonProfileXacmlRequest(string testcase)
        {
            string requestText;

            if (testcase.Contains("AltinnApps"))
            {
                requestText = File.ReadAllText(Path.Combine(GetAltinnAppsPath(), testcase + "Request.json"));
            }
            else
            {
                requestText = File.ReadAllText(Path.Combine(GetConformancePath(), testcase + "Request.json"));
            }

            HttpRequestMessage message = new HttpRequestMessage(HttpMethod.Post, "authorization/api/v1/Decision")
            {
                Content = new StringContent(requestText, Encoding.UTF8, "application/json")
            };
            message.Headers.Add("testcase", testcase);
            message.Headers.Add("Accept", "application/json");

            return message;
        }

        public static async Task<XacmlContextResponse> GetXacmlContextResponseAsync(HttpClient client, HttpRequestMessage httpRequestMessage)
        {
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            XacmlContextResponse contextResponse;

            XmlReaderSettings settings = new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Parse
            };
            using (XmlReader reader2 = XmlReader.Create(new StringReader(responseContent), settings))
            {
                contextResponse = XacmlParser.ReadContextResponse(reader2);
            }

            return contextResponse;
        }

        public static async Task<XacmlJsonResponse> GetXacmlJsonProfileContextResponseAsync(HttpClient client, HttpRequestMessage httpRequestMessage)
        {
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            XacmlJsonResponse xacmlJsonresponse = (XacmlJsonResponse)JsonConvert.DeserializeObject(responseContent, typeof(XacmlJsonResponse));
            return xacmlJsonresponse;
        }

        public static XacmlContextResponse ReadExpectedResponse(string testCase)
        {
            if (testCase.Contains("AltinnApps"))
            {
                return XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetAltinnAppsPath());
            }

            return XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
        }

        public static XacmlJsonResponse ReadExpectedJsonProfileResponse(string testCase)
        {
            string content = null;

            if (testCase.Contains("AltinnApps"))
            {
                content = File.ReadAllText(Path.Combine(GetAltinnAppsPath(), testCase + "Response.json"));
            }
            else
            {
                content = File.ReadAllText(Path.Combine(GetConformancePath(), testCase + "Response.json"));
            }

            XacmlJsonResponse xacmlJsonresponse = (XacmlJsonResponse)JsonConvert.DeserializeObject(content, typeof(XacmlJsonResponse));

            return xacmlJsonresponse;
        }

        public static XacmlContextRequest CreateXacmlContextRequest(string testCase)
        {
            return XacmlTestDataParser.ParseRequest(testCase + "Request.xml", GetAltinnAppsPath());
        }

        public static XacmlContextRequest GetEnrichedRequest(string testCase)
        {
            return XacmlTestDataParser.ParseRequest(testCase + "EnrichedRequest.xml", GetAltinnAppsPath());
        }

        public static Instance GetInstanceData(string instanceId)
        {
            string filePath = Path.Combine(GetInstancePath(), instanceId);
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
                string content = File.ReadAllText(rolesPath);
                roles = (List<Role>)JsonConvert.DeserializeObject(content, typeof(List<Role>));
            }

            return roles;
        }

        public static void DeleteAppBlobData(string org, string app)
        {
            string blobPath = Path.Combine(GetDataBlobPath(), $"{org}/{app}");

            if (Directory.Exists(blobPath))
            {
                Directory.Delete(blobPath, true);
            }
        }

        private static string GetDataBlobPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PolicyRetrievalPointTest).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, "../../../data/blobs/");
        }

        private static string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, "../../../Data/Xacml/3.0/AltinnApps");
        }

        private static string GetConformancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, "../../../Data/Xacml/3.0/ConformanceTests");
        }

        public static string GetInstancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PolicyInformationRepositoryTest).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, "../../../Data/Instances");
        }

        public static string GetApplicationPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PolicyInformationRepositoryTest).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, "../../../Data/Applications");
        }

        private static string GetRolesPath(int coveredByUserId, int offeredByPartyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ContextHandlerTest).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../Data/Roles/User_{coveredByUserId}/party_{offeredByPartyId}/roles.json");
        }
    }
}
