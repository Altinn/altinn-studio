using System;
using System.IO;
using System.Text.Json;
using System.Xml;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.PolicyAdmin.Models;

namespace Designer.Tests.Utils
{
    public static class AuthorizationUtil
    {
        public static XacmlPolicy ParsePolicy(string policyDocumentTitle)
        {
            string policyPath = GetPolicyPath();
            return ParsePolicy(policyDocumentTitle, policyPath);

        }

        public static void WritePolicy(string policyDocumentTitle, XacmlPolicy policy)
        {
            string policyPath = GetPolicyPath();

            MemoryStream stream = new MemoryStream();
            using (XmlWriter writer = XmlWriter.Create(stream, new XmlWriterSettings() { Indent = true }))
            {
                XacmlSerializer.WritePolicy(writer, policy);

                writer.Flush();
                stream.Position = 0;

                using (FileStream file = new FileStream(Path.Combine(policyPath, policyDocumentTitle), FileMode.Create, System.IO.FileAccess.Write))
                {
                    byte[] bytes = new byte[stream.Length];
                    stream.Read(bytes, 0, (int)stream.Length);
                    file.Write(bytes, 0, bytes.Length);
                    stream.Close();
                }
            }

        }

        public static void WriteJsonPolicy(string policyDocumentTitle, ResourcePolicy policy)
        {
            string policyPath = GetPolicyPath();

            string jsonString = JsonSerializer.Serialize(policy, new JsonSerializerOptions() { WriteIndented = true });

            File.WriteAllText(Path.Combine(policyPath, policyDocumentTitle), jsonString);
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
