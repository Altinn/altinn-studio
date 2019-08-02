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
            policyDocument.Load(Path.Combine(GetAltinnAppsPath(), "AltinnApps0001Policy.xml"));

            XacmlPolicy result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
               result = XacmlParser.ParseXacmlPolicy(reader);
            }

            Assert.NotNull(result);
            Assert.Equal(2, result.Rules.Count);
        }

        private string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(Xacml30ParserTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\AltinnApps");
        }
    }
}
