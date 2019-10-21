using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;

namespace Altinn.Authorization.ABAC.UnitTest.Utils
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

        /// <summary>
        /// Parses a Xacml 3.0 Policy
        /// </summary>
        /// <param name="policyDocumentTitle"></param>
        /// <param name="policyPath"></param>
        /// <returns></returns>
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
    }
}
