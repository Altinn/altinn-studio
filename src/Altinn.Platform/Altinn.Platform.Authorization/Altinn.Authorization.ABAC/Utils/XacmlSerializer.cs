using System;
using System.Xml;
using System.Xml.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Authorization.ABAC.Utils
{
    /// <summary>
    /// Utility to parse XACM objects to XML or JSON.
    /// </summary>
    public static class XacmlSerializer
    {
        /// <summary>
        /// Method to serialize the XACML Response.
        /// </summary>
        /// <param name="writer">XML Writer.</param>
        /// <param name="xacmlContextResponse">The responze.</param>
        public static void WriteContextResponse(XmlWriter writer, XacmlContextResponse xacmlContextResponse)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlContextResponse, nameof(xacmlContextResponse));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Response, Xacml30Constants.NameSpaces.Policy);

            if (xacmlContextResponse.Results.Count == 0)
            {
                throw new InvalidOperationException("Empty result");
            }

            foreach (var result in xacmlContextResponse.Results)
            {
                WriteContextResult(writer, result);
            }

            writer.WriteEndElement();
        }

        private static void WriteContextResult(XmlWriter writer, XacmlContextResult xacmlContextResult)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlContextResult, nameof(xacmlContextResult));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Result, Xacml30Constants.NameSpaces.Policy);

            WriteContextDecision(writer, xacmlContextResult.Decision);

            if (xacmlContextResult.Status != null)
            {
                WriteContextStatus(writer, xacmlContextResult.Status);
            }

            if (xacmlContextResult.Obligations.Count > 0)
            {
                writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Obligations, Xacml30Constants.NameSpaces.Policy);

                foreach (XacmlObligation val in xacmlContextResult.Obligations)
                {
                    WriteObligation(writer, val);
                }

                writer.WriteEndElement();
            }

            if (xacmlContextResult.Advices.Count > 0)
            {
                writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AssociatedAdvice, Xacml30Constants.NameSpaces.Policy);

                foreach (XacmlAdvice val in xacmlContextResult.Advices)
                {
                    WriteAdvice(writer, val);
                }

                writer.WriteEndElement();
            }

            if (xacmlContextResult.Attributes.Count > 0)
            {
                foreach (XacmlContextAttributes attr in xacmlContextResult.Attributes)
                {
                    WriteContextAttributes(writer, attr);
                }
            }

            if (xacmlContextResult.PolicyIdReferences.Count > 0 || xacmlContextResult.PolicySetIdReferences.Count > 0)
            {
                writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.PolicyIdentifierList, Xacml30Constants.NameSpaces.Policy);

                foreach (XacmlContextPolicyIdReference pref in xacmlContextResult.PolicyIdReferences)
                {
                    WritePolicyIdReference(writer, pref);
                }

                foreach (XacmlContextPolicySetIdReference psref in xacmlContextResult.PolicySetIdReferences)
                {
                    WritePolicySetIdReference(writer, psref);
                }

                writer.WriteEndElement();
            }

            writer.WriteEndElement();
        }

        private static void WriteContextDecision(XmlWriter writer, XacmlContextDecision xacmlContextDecision)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));

            string value;
            switch (xacmlContextDecision)
            {
                case XacmlContextDecision.Deny:
                    value = "Deny";
                    break;

                case XacmlContextDecision.Indeterminate:
                    value = "Indeterminate";
                    break;

                case XacmlContextDecision.NotApplicable:
                    value = "NotApplicable";
                    break;

                case XacmlContextDecision.Permit:
                    value = "Permit";
                    break;

                default:
                    throw new InvalidOperationException("Not a valid value");
            }

            writer.WriteElementString(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Decision, Xacml30Constants.NameSpaces.Policy, value);
        }

        private static void WriteContextStatus(XmlWriter writer, XacmlContextStatus xacmlContextStatus)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlContextStatus, nameof(xacmlContextStatus));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Status, Xacml30Constants.NameSpaces.Policy);

            WriteContextStatusCode(writer, xacmlContextStatus.StatusCode);

            if (!string.IsNullOrEmpty(xacmlContextStatus.StatusMessage))
            {
                writer.WriteElementString(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.StatusMessage, Xacml30Constants.NameSpaces.Policy, xacmlContextStatus.StatusMessage);
            }

            if (xacmlContextStatus.StatusDetail.Count > 0)
            {
                writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.StatusDetail, Xacml30Constants.NameSpaces.Policy);

                foreach (XmlElement element in xacmlContextStatus.StatusDetail)
                {
                    element.WriteTo(writer);
                }

                writer.WriteEndElement();
            }

            writer.WriteEndElement();
        }

        private static void WriteObligation(XmlWriter writer, XacmlObligation xacmlObligation)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlObligation, nameof(xacmlObligation));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Obligation, Xacml30Constants.NameSpaces.Policy);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.ObligationId, xacmlObligation.ObligationId.OriginalString);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.FulfillOn, xacmlObligation.FulfillOn.ToString());

            foreach (XacmlAttributeAssignment attributeAssigment in xacmlObligation.AttributeAssignment)
            {
                WriteAttributeAssignment(writer, attributeAssigment);
            }

            writer.WriteEndElement();
        }

        private static void WriteAdvice(XmlWriter writer, XacmlAdvice xacmlAdvice)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAdvice, nameof(xacmlAdvice));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Advice, Xacml30Constants.NameSpaces.Policy);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.AdviceId, xacmlAdvice.AdviceId.OriginalString);

            foreach (var attributeAssigment in xacmlAdvice.AttributeAssignment)
            {
                WriteAttributeAssignment(writer, attributeAssigment);
            }

            writer.WriteEndElement();
        }

        private static void WriteAttributeAssignment(XmlWriter writer, XacmlAttributeAssignment xacmlAttributeAssignment)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAttributeAssignment, nameof(xacmlAttributeAssignment));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AttributeAssignment, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.DataType, xacmlAttributeAssignment.DataType.OriginalString);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.AttributeId, xacmlAttributeAssignment.AttributeId.OriginalString);

            if (xacmlAttributeAssignment.Category != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.Category, xacmlAttributeAssignment.Category.OriginalString);
            }

            if (!string.IsNullOrEmpty(xacmlAttributeAssignment.Issuer))
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.Issuer, xacmlAttributeAssignment.Issuer);
            }

            if (xacmlAttributeAssignment.Value != null)
            {
                writer.WriteString(xacmlAttributeAssignment.Value);
            }
            else
            {
                WriteAnyElement(writer, (XacmlAnyElement)xacmlAttributeAssignment);
            }

            writer.WriteEndElement();
        }

        private static void WriteContextAttributes(XmlWriter writer, XacmlContextAttributes xacmlContextAttributes)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlContextAttributes, nameof(xacmlContextAttributes));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Attributes, Xacml30Constants.NameSpaces.Policy);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.Category, xacmlContextAttributes.Category.OriginalString);

            if (xacmlContextAttributes.Id != null)
            {
                writer.WriteAttributeString(XacmlConstants.Prefixes.Xml, XacmlConstants.AttributeNames.Id, XmlConstants.Namespaces.XmlNamespace, xacmlContextAttributes.Id.ToString());
            }

            if (!string.IsNullOrEmpty(xacmlContextAttributes.Content))
            {
                writer.WriteElementString(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Content, Xacml30Constants.NameSpaces.Policy, xacmlContextAttributes.Content);
            }

            foreach (var attr in xacmlContextAttributes.Attributes)
            {
                writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Attribute, Xacml30Constants.NameSpaces.Policy);

                writer.WriteAttributeString(XacmlConstants.AttributeNames.AttributeId, attr.AttributeId.OriginalString);
                writer.WriteAttributeString(XacmlConstants.AttributeNames.IncludeInResult, attr.IncludeInResult.ToString().ToLower());

                if (!string.IsNullOrEmpty(attr.Issuer))
                {
                    writer.WriteAttributeString(XacmlConstants.AttributeNames.Issuer, attr.Issuer);
                }

                foreach (XacmlAttributeValue attrVal in attr.AttributeValues)
                {
                    WriteAttributeValue(writer, attrVal);
                }

                writer.WriteEndElement();
            }

            writer.WriteEndElement();
        }

        private static void WriteAttributeValue(XmlWriter writer, XacmlAttributeValue xacmlAttributeValue)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAttributeValue, nameof(xacmlAttributeValue));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AttributeValue, Xacml30Constants.NameSpaces.Policy);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.DataType, xacmlAttributeValue.DataType.OriginalString);

            if (xacmlAttributeValue.Value != null)
            {
                writer.WriteString(xacmlAttributeValue.Value);
            }
            else
            {
                WriteAnyElement(writer, (XacmlAnyElement)xacmlAttributeValue);
            }

            writer.WriteEndElement();
        }

        private static void WritePolicyIdReference(XmlWriter writer, XacmlContextPolicyIdReference xacmlContextPolicyIdReference)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlContextPolicyIdReference, nameof(xacmlContextPolicyIdReference));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.PolicyIdReference, Xacml30Constants.NameSpaces.Policy);

            if (xacmlContextPolicyIdReference.Version != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.Version, xacmlContextPolicyIdReference.Version.ToString());
            }

            if (xacmlContextPolicyIdReference.EarliestVersion != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.EarliestVersion, xacmlContextPolicyIdReference.EarliestVersion.ToString());
            }

            if (xacmlContextPolicyIdReference.LatestVersion != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.LatestVersion, xacmlContextPolicyIdReference.LatestVersion.ToString());
            }

            writer.WriteEndElement();
        }

        private static void WritePolicySetIdReference(XmlWriter writer, XacmlContextPolicySetIdReference xacmlContextPolicySetIdReference)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlContextPolicySetIdReference, nameof(xacmlContextPolicySetIdReference));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.PolicySetIdReference, Xacml30Constants.NameSpaces.Policy);

            if (xacmlContextPolicySetIdReference.Version != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.Version, xacmlContextPolicySetIdReference.Version.ToString());
            }

            if (xacmlContextPolicySetIdReference.EarliestVersion != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.EarliestVersion, xacmlContextPolicySetIdReference.EarliestVersion.ToString());
            }

            if (xacmlContextPolicySetIdReference.LatestVersion != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.LatestVersion, xacmlContextPolicySetIdReference.LatestVersion.ToString());
            }

            writer.WriteEndElement();
        }

        private static void WriteContextStatusCode(XmlWriter writer, XacmlContextStatusCode xacmlContextStatusCode)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlContextStatusCode, nameof(xacmlContextStatusCode));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.StatusCode, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.Value, xacmlContextStatusCode.Value.ToString());

            if (xacmlContextStatusCode.StatusCode != null)
            {
                WriteContextStatusCode(writer, xacmlContextStatusCode.StatusCode);
            }

            writer.WriteEndElement();
        }

        private static void WriteAnyElement(XmlWriter writer, XacmlAnyElement xacmlAnyElement)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAnyElement, nameof(xacmlAnyElement));

            foreach (XAttribute attr in xacmlAnyElement.Attributes)
            {
                writer.WriteAttributeString(attr.Name.LocalName, attr.Name.NamespaceName, attr.Value);
            }

            foreach (var elem in xacmlAnyElement.Elements)
            {
                elem.WriteTo(writer);
            }
        }
    }
}
