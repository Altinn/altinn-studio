using System;
using System.IO;
using System.Linq;
using System.Xml;
using Altinn.Authorization.ABAC.UnitTest.Utils;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;

using Xunit;
using Xunit.Sdk;

namespace Altinn.Authorization.ABAC.UnitTests
{
    public class Xacml30SerializerTests
    {
        [Fact]
        public void SerializedXACMLPolicy_ShouldBeEqual()
        {
            XmlDocument policyDocument = new XmlDocument();
            policyDocument.Load(Path.Combine(GetAltinnAppsPath(), "AltinnApps0001Policy.xml"));

            XacmlPolicy originalPolicy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
               originalPolicy = XacmlParser.ParseXacmlPolicy(reader);
            }

            MemoryStream dataStream = new MemoryStream();
            XmlWriter writer = XmlWriter.Create(dataStream);

            XacmlSerializer.WritePolicy(writer, originalPolicy);

            writer.Flush();
            dataStream.Position = 0;

            XacmlPolicy serializedPolicy;
            using (XmlReader reader = XmlReader.Create(dataStream))
            {
                serializedPolicy = XacmlParser.ParseXacmlPolicy(reader);
            }

            AssertionUtil.AssertPolicyEqual(originalPolicy, serializedPolicy);
        }

        [Fact]
        public void SerializeXACMLPolicy_ShouldBeUnequal()
        {
            XmlDocument policyDocument = new XmlDocument();
            policyDocument.Load(Path.Combine(GetAltinnAppsPath(), "AltinnApps0001Policy.xml"));

            XacmlPolicy originalPolicy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                originalPolicy = XacmlParser.ParseXacmlPolicy(reader);
            }

            MemoryStream dataStream = new MemoryStream();
            XmlWriter writer = XmlWriter.Create(dataStream);

            XacmlSerializer.WritePolicy(writer, originalPolicy);

            writer.Flush();
            dataStream.Position = 0;

            XacmlPolicy serializedPolicy;
            using (XmlReader reader = XmlReader.Create(dataStream))
            {
                serializedPolicy = XacmlParser.ParseXacmlPolicy(reader);
            }

            // Change a bottom node value on serialized policy model to verify that Assertion should fail
            string originalAttributeValue = originalPolicy.Rules.First().Target.AnyOf.First().AllOf.First().Matches.First().AttributeValue.Value;
            string actualAttributeValue = "THIS IS NOT THE VALUE YOU ARE LOOKING FOR";
            serializedPolicy.Rules.First().Target.AnyOf.First().AllOf.First().Matches.First().AttributeValue.Value = actualAttributeValue;

            try
            {
                AssertionUtil.AssertPolicyEqual(originalPolicy, serializedPolicy);
            }
            catch (EqualException e)
            {
                Assert.Equal(e.Expected, originalAttributeValue);
                Assert.Equal(e.Actual, actualAttributeValue);
            }
        }

        private string GetAltinnAppsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(Xacml30ParserTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\AltinnApps");
        }
    }
}
