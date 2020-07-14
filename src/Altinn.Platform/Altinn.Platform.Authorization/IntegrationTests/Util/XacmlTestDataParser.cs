using System.IO;
using System.Xml;

using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Platform.Authorization.IntegrationTests.Util
{
    public static class XacmlTestDataParser
    {
        /// <summary>
        /// Parses a XACML Response document
        /// </summary>
        /// <param name="responseDocumentTitle">The response document title</param>
        /// <param name="responsePath">The response path</param>
        /// <returns></returns>
        public static XacmlContextResponse ParseResponse(string responseDocumentTitle, string responsePath)
        {
            XmlDocument responseDocument = new XmlDocument();
            responseDocument.Load(Path.Combine(responsePath, responseDocumentTitle));
            XacmlContextResponse contextResponeExpected;
            using (XmlReader reader = XmlReader.Create(new StringReader(responseDocument.OuterXml)))
            {
                contextResponeExpected = XacmlParser.ReadContextResponse(reader);
            }

            return contextResponeExpected;
        }

        public static XacmlContextRequest ParseRequest(string requestDocumentTitle, string requestPath)
        {
            XmlDocument requestDocument = new XmlDocument();
            requestDocument.Load(Path.Combine(requestPath, requestDocumentTitle));
            XacmlContextRequest contextRequest;
            using (XmlReader reader = XmlReader.Create(new StringReader(requestDocument.OuterXml)))
            {
                contextRequest = XacmlParser.ReadContextRequest(reader);
            }

            return contextRequest;
        }
    }
}
