using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using System;
using System.IO;
using System.Xml;
using Xunit;

namespace Altinn.Authorization.ABAC.UnitTests
{
    public class Xacml30ParserTests
    {
        [Fact]
        public void ParseXACMLPolicy()
        {
            XmlDocument policyDocument = new XmlDocument();
            policyDocument.Load(Path.Combine(GetPolicyPath(), "AltinnApps0001Policy.xml"));

            XacmlPolicy result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
               result = Xacml30Parser.ParseXacmlPolicy(reader);
            }

            Assert.NotNull(result);
            Assert.Equal(2, result.Rules.Count);
        }



        private string GetPolicyPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(Xacml30ParserTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\Policy");
        }
    }
}
