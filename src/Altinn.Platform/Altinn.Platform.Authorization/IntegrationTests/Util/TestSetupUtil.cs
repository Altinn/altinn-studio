using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

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

            HttpRequestMessage message = new HttpRequestMessage(HttpMethod.Post, "/api/Decision")
            {
                Content = new StringContent(policyDocument.OuterXml, Encoding.UTF8, "application/xml")
            };
            message.Headers.Add("testcase", testcase);

            return message;
        }

        public static async Task<XacmlContextResponse> GetXacmlContextResponseAsync(HttpClient client, HttpRequestMessage httpRequestMessage)
        {
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

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

        public static XacmlContextResponse ReadExpectedResponse(string testCase)
        {
            if (testCase.Contains("AltinnApps"))
            {
                return XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetAltinnAppsPath());
            }

            return XacmlTestDataParser.ParseResponse(testCase + "Response.xml", GetConformancePath());
        }

        private static string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\AltinnApps");
        }

        private static string GetConformancePath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AltinnApps_DecisionTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\ConformanceTests");
        }
    }
}
