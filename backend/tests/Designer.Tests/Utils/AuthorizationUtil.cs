using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using System.Xml;

namespace Designer.Tests.Utils
{
    public static class AuthorizationUtil
    {
        public static XacmlPolicy ParsePolicy(string policyDocumentTitle)
        {
            string policyPath = GetPolicyPath();
            return ParsePolicy(policyDocumentTitle, policyPath);

        }

        public static XacmlPolicy ParsePolicy(string policyDocumentTitle, string policyPath)
        {
            XmlDocument policyDocument = new XmlDocument();

            policyDocument.Load(Path.Combine(policyPath, policyDocumentTitle));
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        private static string GetPolicyPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AuthorizationUtil).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Authorization", "Policies", "Xacml");
        }
    }
}
