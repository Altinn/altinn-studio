using System;
using System.Collections.Generic;
using System.Xml;
using System.Xml.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Authorization.ABAC.Utils
{
    /// <summary>
    /// Utility to serialize XACML objects to XML or JSON.
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

        /// <summary>
        /// Method to serialize a XACML Policy.
        /// </summary>
        /// <param name="writer">XML Writer</param>
        /// <param name="xacmlPolicy">The XACML Policy to be serialized</param>
        public static void WritePolicy(XmlWriter writer, XacmlPolicy xacmlPolicy)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlPolicy, nameof(xacmlPolicy));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Policy, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.PolicyId, xacmlPolicy.PolicyId.OriginalString);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.Version, xacmlPolicy.Version);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.RuleCombiningAlgId, xacmlPolicy.RuleCombiningAlgId.OriginalString);

            if (xacmlPolicy.MaxDelegationDepth != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.MaxDelegationDepth, xacmlPolicy.MaxDelegationDepth.ToString());
            }

            if (xacmlPolicy.PolicyIssuer != null)
            {
                WriteIssuer(writer, xacmlPolicy.PolicyIssuer);
            }

            if (xacmlPolicy.Description != null)
            {
                WriteDescription(writer, xacmlPolicy.Description);
            }

            if (xacmlPolicy.Target != null)
            {
                WriteTarget(writer, xacmlPolicy.Target);
            }

            foreach (XacmlRule rule in xacmlPolicy.Rules)
            {
                WriteRule(writer, rule);
            }

            if (xacmlPolicy.ObligationExpressions != null && xacmlPolicy.ObligationExpressions.Count > 0)
            {
                WriteObligationExpressions(writer, xacmlPolicy.ObligationExpressions);
            }

            if (xacmlPolicy.AdviceExpressions != null && xacmlPolicy.AdviceExpressions.Count > 0)
            {
                WriteAdviceExpressions(writer, xacmlPolicy.AdviceExpressions);
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

        private static void WriteObligationExpressions(XmlWriter writer, ICollection<XacmlObligationExpression> xacmlObligationExpressions)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlObligationExpressions, nameof(xacmlObligationExpressions));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.ObligationExpressions, Xacml30Constants.NameSpaces.Policy);

            foreach (XacmlObligationExpression xacmlObligationExpression in xacmlObligationExpressions)
            {
                WriteObligationExpression(writer, xacmlObligationExpression);
            }

            writer.WriteEndElement();
        }

        private static void WriteObligationExpression(XmlWriter writer, XacmlObligationExpression xacmlObligationExpression)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlObligationExpression, nameof(xacmlObligationExpression));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.ObligationExpression, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.ObligationId, xacmlObligationExpression.ObligationId.OriginalString);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.FulfillOn, xacmlObligationExpression.FulfillOn.ToString());

            foreach (XacmlAttributeAssignmentExpression attributeAssigmentExpression in xacmlObligationExpression.AttributeAssignmentExpressions)
            {
                WriteAttributeAssignmentExpression(writer, attributeAssigmentExpression);
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

        private static void WriteAdviceExpressions(XmlWriter writer, ICollection<XacmlAdviceExpression> xacmlAdviceExpressions)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAdviceExpressions, nameof(xacmlAdviceExpressions));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AdviceExpressions, Xacml30Constants.NameSpaces.Policy);

            foreach (XacmlAdviceExpression xacmlAdviceExpression in xacmlAdviceExpressions)
            {
                WriteAdviceExpression(writer, xacmlAdviceExpression);
            }

            writer.WriteEndElement();
        }

        private static void WriteAdviceExpression(XmlWriter writer, XacmlAdviceExpression xacmlAdviceExpression)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAdviceExpression, nameof(xacmlAdviceExpression));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AdviceExpression, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.AdviceId, xacmlAdviceExpression.AdviceId.OriginalString);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.FulfillOn, xacmlAdviceExpression.AppliesTo.ToString());

            foreach (XacmlAttributeAssignmentExpression attributeAssigmentExpression in xacmlAdviceExpression.AttributeAssignmentExpressions)
            {
                WriteAttributeAssignmentExpression(writer, attributeAssigmentExpression);
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

        private static void WriteAttributeAssignmentExpression(XmlWriter writer, XacmlAttributeAssignmentExpression xacmlAttributeAssignmentExpression)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAttributeAssignmentExpression, nameof(xacmlAttributeAssignmentExpression));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AttributeAssignmentExpression, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.AttributeId, xacmlAttributeAssignmentExpression.AttributeId.OriginalString);
            if (xacmlAttributeAssignmentExpression.Category != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.Category, xacmlAttributeAssignmentExpression.Category.OriginalString);
            }

            if (!string.IsNullOrEmpty(xacmlAttributeAssignmentExpression.Issuer))
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.Issuer, xacmlAttributeAssignmentExpression.Issuer);
            }

            if (xacmlAttributeAssignmentExpression.Property != null)
            {
                WriteExpression(writer, xacmlAttributeAssignmentExpression.Property);
            }

            writer.WriteEndElement();
        }

        private static void WriteExpression(XmlWriter writer, IXacmlExpression xacmlExpression)
        {
            switch (xacmlExpression.GetType().Name)
            {
                case "XacmlAttributeValue":
                    WriteAttributeValue(writer, (XacmlAttributeValue)xacmlExpression);
                    break;
                case "XacmlAttributeDesignator":
                    WriteAttributeDesignator(writer, (XacmlAttributeDesignator)xacmlExpression);
                    break;
                case "XacmlAttributeSelector":
                case "XacmlApply":
                case "XacmlVariableReference":
                case "XacmlFunction":
                default:
                    throw new NotImplementedException($"XacmlSerializer: Serialization of type {xacmlExpression.GetType().Name} currently not supported");
            }
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

        private static void WriteAttributeDesignator(XmlWriter writer, XacmlAttributeDesignator xacmlAttributeDesignator)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAttributeDesignator, nameof(xacmlAttributeDesignator));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AttributeDesignator, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.AttributeId, xacmlAttributeDesignator.AttributeId.OriginalString);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.Category, xacmlAttributeDesignator.Category.OriginalString);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.DataType, xacmlAttributeDesignator.DataType.OriginalString);

            if (xacmlAttributeDesignator.MustBePresent != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.MustBePresent, xacmlAttributeDesignator.MustBePresent.ToString().ToLower());
            }

            if (!string.IsNullOrEmpty(xacmlAttributeDesignator.Issuer))
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.Issuer, xacmlAttributeDesignator.Issuer);
            }

            writer.WriteEndElement();
        }

        private static void WriteAttribute(XmlWriter writer, XacmlAttribute xacmlAttribute)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAttribute, nameof(xacmlAttribute));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Attribute, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.AttributeId, xacmlAttribute.AttributeId.OriginalString);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.IncludeInResult, xacmlAttribute.IncludeInResult.ToString().ToLower());

            if (xacmlAttribute.Issuer != null)
            {
                writer.WriteAttributeString(XacmlConstants.AttributeNames.Issuer, xacmlAttribute.Issuer);
            }

            foreach (XacmlAttributeValue attributeValue in xacmlAttribute.AttributeValues)
            {
                WriteAttributeValue(writer, attributeValue);
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

        private static void WriteTarget(XmlWriter writer, XacmlTarget xacmlTarget)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlTarget, nameof(xacmlTarget));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Target, Xacml30Constants.NameSpaces.Policy);

            foreach (XacmlAnyOf xacmlAnyOf in xacmlTarget.AnyOf)
            {
                WriteAnyOf(writer, xacmlAnyOf);
            }

            writer.WriteEndElement();
        }

        private static void WriteAnyOf(XmlWriter writer, XacmlAnyOf xacmlAnyOf)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAnyOf, nameof(xacmlAnyOf));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AnyOf, Xacml30Constants.NameSpaces.Policy);

            foreach (XacmlAllOf xacmlAllOf in xacmlAnyOf.AllOf)
            {
                WriteAllOf(writer, xacmlAllOf);
            }

            writer.WriteEndElement();
        }

        private static void WriteAllOf(XmlWriter writer, XacmlAllOf xacmlAllOf)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlAllOf, nameof(xacmlAllOf));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.AllOf, Xacml30Constants.NameSpaces.Policy);

            foreach (XacmlMatch xacmlMatch in xacmlAllOf.Matches)
            {
                WriteMatch(writer, xacmlMatch);
            }

            writer.WriteEndElement();
        }

        private static void WriteMatch(XmlWriter writer, XacmlMatch xacmlMatch)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlMatch, nameof(xacmlMatch));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Match, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.MatchId, xacmlMatch.MatchId.OriginalString);

            if (xacmlMatch.AttributeValue != null)
            {
                WriteAttributeValue(writer, xacmlMatch.AttributeValue);
            }

            if (xacmlMatch.AttributeDesignator != null)
            {
                WriteAttributeDesignator(writer, xacmlMatch.AttributeDesignator);
            }

            if (xacmlMatch.AttributeSelector != null)
            {
                throw new NotImplementedException($"XacmlSerializer: Serialization of type {xacmlMatch.AttributeSelector.GetType().Name} currently not supported");
            }

            writer.WriteEndElement();
        }

        private static void WriteRule(XmlWriter writer, XacmlRule xacmlRule)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlRule, nameof(xacmlRule));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Rule, Xacml30Constants.NameSpaces.Policy);

            writer.WriteAttributeString(XacmlConstants.AttributeNames.RuleId, xacmlRule.RuleId);
            writer.WriteAttributeString(XacmlConstants.AttributeNames.Effect, xacmlRule.Effect.ToString());

            if (xacmlRule.Description != null)
            {
                WriteDescription(writer, xacmlRule.Description);
            }

            if (xacmlRule.Target != null)
            {
                WriteTarget(writer, xacmlRule.Target);
            }

            if (xacmlRule.Condition != null)
            {
                throw new NotImplementedException($"XacmlSerializer: Serialization of type {xacmlRule.Condition.GetType().Name} currently not supported");
            }

            if (xacmlRule.Obligations != null && xacmlRule.Obligations.Count > 0)
            {
                WriteObligationExpressions(writer, xacmlRule.Obligations);
            }

            if (xacmlRule.Advices != null && xacmlRule.Advices.Count > 0)
            {
                WriteAdviceExpressions(writer, xacmlRule.Advices);
            }

            writer.WriteEndElement();
        }

        private static void WriteIssuer(XmlWriter writer, XacmlPolicyIssuer xacmlPolicyIssuer)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(xacmlPolicyIssuer, nameof(xacmlPolicyIssuer));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.PolicyIssuer, Xacml30Constants.NameSpaces.Policy);

            if (xacmlPolicyIssuer.Attributes != null)
            {
                foreach (XacmlAttribute attribute in xacmlPolicyIssuer.Attributes)
                {
                    WriteAttribute(writer, attribute);
                }
            }

            writer.WriteEndElement();
        }

        private static void WriteDescription(XmlWriter writer, string description)
        {
            Guard.ArgumentNotNull(writer, nameof(writer));
            Guard.ArgumentNotNull(description, nameof(description));

            writer.WriteStartElement(XacmlConstants.Prefixes.Xacml, XacmlConstants.ElementNames.Description, Xacml30Constants.NameSpaces.Policy);
            writer.WriteString(description);
            writer.WriteEndElement();
        }
    }
}
