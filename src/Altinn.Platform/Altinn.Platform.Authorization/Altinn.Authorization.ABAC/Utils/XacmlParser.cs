using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Authorization.ABAC.Utils
{
    /// <summary>
    /// Parser Responsible for parsing XACML XML documents to XACML models.
    /// </summary>
    public static class XacmlParser
    {
        /// <summary>
        /// Delegate to make it possible to send different read methods in to metods.
        /// </summary>
        /// <typeparam name="T">The type.</typeparam>
        /// <param name="reader">The xml reader.</param>
        /// <returns>The element.</returns>
        private delegate T ReadElement<out T>(XmlReader reader);

        /// <summary>
        /// Parses a Xacml 3.0 XML Policy.
        /// </summary>
        /// <param name="reader">A XML Reader with the Policy loaded.</param>
        /// <returns>The XACML Policy.</returns>
        public static XacmlPolicy ParseXacmlPolicy(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Policy);

            // IDentify the xml namespaces used in xacml policy document. Iterate over all attributes in document root.
            IDictionary<string, string> xmlNameSpaces = new Dictionary<string, string>();
            for (int i = 0; i < reader.AttributeCount; i++)
            {
                reader.MoveToAttribute(i);
                if (reader.Prefix == XmlConstants.AttributeNames.XmlNameSpacePrefix)
                {
                    xmlNameSpaces.Add(reader.LocalName, reader.Value);
                }
            }

            string ruleCombiningAlgId = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.RuleCombiningAlgId);
            string policyId = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.PolicyId);
            string version = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Version, isRequered: false);
            int? maxDelegationDepth = ReadAttribute<int?>(reader, XacmlConstants.AttributeNames.MaxDelegationDepth, Xacml30Constants.NameSpaces.Policy, isRequered: false);

            reader.ReadStartElement(XacmlConstants.ElementNames.Policy, Xacml30Constants.NameSpaces.Policy);

            string description = null;
            if (reader.IsStartElement(XacmlConstants.ElementNames.Description, Xacml30Constants.NameSpaces.Policy))
            {
                description = reader.ReadElementContentAsString(XacmlConstants.ElementNames.Description, Xacml30Constants.NameSpaces.Policy);
            }

            XacmlPolicyIssuer issuer = ReadOptional<XacmlPolicyIssuer>(XacmlConstants.ElementNames.PolicyIssuer, Xacml30Constants.NameSpaces.Policy, ReadPolicyIssuer, reader);

            string xpathVersion = null;
            if (reader.IsStartElement(XacmlConstants.ElementNames.PolicyDefaults, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.PolicyDefaults, Xacml30Constants.NameSpaces.Policy);
                ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.XPathVersion);
                xpathVersion = reader.ReadElementContentAsString(XacmlConstants.ElementNames.XPathVersion, Xacml30Constants.NameSpaces.Policy);

                reader.ReadEndElement();
            }

            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Target);
            XacmlTarget target = ReadTarget(reader);

            XacmlPolicy policy = new XacmlPolicy(new Uri(policyId, UriKind.RelativeOrAbsolute), new Uri(ruleCombiningAlgId, UriKind.RelativeOrAbsolute), target)
            {
                Description = description,
                XPathVersion = xpathVersion != null ? new Uri(xpathVersion) : null,
                PolicyIssuer = issuer,
                MaxDelegationDepth = maxDelegationDepth,
                Namespaces = xmlNameSpaces,
                Version = version,
            };

            IDictionary<Tuple<string, string>, Action> choiceElementsWithReaderAction = new Dictionary<Tuple<string, string>, Action>()
            {
                {
                    new Tuple<string, string>(XacmlConstants.ElementNames.CombinerParameters, Xacml30Constants.NameSpaces.Policy), () =>
                    {
                        reader.ReadStartElement(XacmlConstants.ElementNames.CombinerParameters, Xacml30Constants.NameSpaces.Policy);
                        ReadList(policy.ChoiceCombinerParameters, XacmlConstants.ElementNames.CombinerParameter, Xacml30Constants.NameSpaces.Policy, ReadCombinerParameter, reader, isRequired: false);
                        reader.ReadEndElement();
                    }
                },
                { new Tuple<string, string>(XacmlConstants.ElementNames.RuleCombinerParameters, Xacml30Constants.NameSpaces.Policy), () => policy.RuleCombinerParameters.Add(ReadRuleCombinerParameters(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.VariableDefinition, Xacml30Constants.NameSpaces.Policy), () => policy.VariableDefinitions.Add(ReadVariableDefinition(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.Rule, Xacml30Constants.NameSpaces.Policy), () => policy.Rules.Add(ReadRule(reader)) },
            };

            ReadChoiceElements(reader, choiceElementsWithReaderAction);

            if (policy.VariableDefinitions.Count == 0 && policy.Rules.Count == 0)
            {
                throw ThrowXmlParserException(reader, "VariableDefinition or Rule are required");
            }

            ValidateNotMoreThanOneElement(reader, policy.CombinerParameters.Count, XacmlConstants.ElementNames.CombinerParameters);
            ValidateNotMoreThanOneElement(reader, policy.RuleCombinerParameters.Count, XacmlConstants.ElementNames.RuleCombinerParameters);

            if (reader.IsStartElement(XacmlConstants.ElementNames.ObligationExpressions, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.ObligationExpressions, Xacml30Constants.NameSpaces.Policy);
                ReadList(policy.ObligationExpressions, XacmlConstants.ElementNames.ObligationExpression, Xacml30Constants.NameSpaces.Policy, ReadObligationExpression, reader, isRequired: true);
                reader.ReadEndElement();
            }

            if (reader.IsStartElement(XacmlConstants.ElementNames.AdviceExpressions, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.AdviceExpressions, Xacml30Constants.NameSpaces.Policy);
                ReadList(policy.AdviceExpressions, XacmlConstants.ElementNames.AdviceExpression, Xacml30Constants.NameSpaces.Policy, ReadAdviceExpression, reader, isRequired: true);
                reader.ReadEndElement();
            }

            // end policy
            reader.ReadEndElement();

            return policy;
        }

        /// <summary>
        /// Parses XML based Xacml Context Request.
        /// </summary>
        /// <param name="reader">The XNL Reader.</param>
        /// <returns>XacmlContextRequest the XacmlContextRequest.</returns>
        public static XacmlContextRequest ReadContextRequest(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));

            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Request);

            bool returnPolicyIdList = ReadAttribute<bool>(reader, XacmlConstants.AttributeNames.ReturnPolicyIdList);

            // Multiple request in Context is not supported
            bool combinedDecision = ReadAttribute<bool>(reader, XacmlConstants.AttributeNames.CombinedDecision);
            if (combinedDecision)
            {
                throw new XmlException("Multiple Decision Profile not implemented");
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.Request, Xacml30Constants.NameSpaces.Policy);

            Uri pathVersion = null;
            if (reader.IsStartElement(XacmlConstants.ElementNames.RequestDefaults, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.RequestDefaults, Xacml30Constants.NameSpaces.Policy);
                if (!reader.IsStartElement(XacmlConstants.ElementNames.XPathVersion, Xacml30Constants.NameSpaces.Policy))
                {
                    throw new XmlException("XPathVerison NotStartElement");
                }

                pathVersion = new Uri(reader.ReadElementContentAsString(XacmlConstants.ElementNames.XPathVersion, Xacml30Constants.NameSpaces.Policy), UriKind.RelativeOrAbsolute);
                reader.ReadEndElement();
            }

            List<XacmlContextAttributes> attributes = new List<XacmlContextAttributes>();
            ReadList<XacmlContextAttributes>(attributes, XacmlConstants.ElementNames.Attributes, Xacml30Constants.NameSpaces.Policy, ReadContextAttributes, reader, isRequired: true);

            XacmlContextRequest result = new XacmlContextRequest(returnPolicyIdList, combinedDecision, attributes)
            {
                XPathVersion = pathVersion,
            };

            if (reader.IsStartElement(XacmlConstants.ElementNames.MultiRequests, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.MultiRequests, Xacml30Constants.NameSpaces.Policy);

                ReadList<XacmlContextRequestReference>(
                    result.RequestReferences,
                    XacmlConstants.ElementNames.RequestReference,
                    Xacml30Constants.NameSpaces.Policy,
                    o =>
                    {
                        reader.ReadStartElement(XacmlConstants.ElementNames.RequestReference, Xacml30Constants.NameSpaces.Policy);
                        ICollection<string> refer = new List<string>();
                        ReadList<string>(
                            refer,
                            XacmlConstants.ElementNames.AttributesReference,
                            Xacml30Constants.NameSpaces.Policy,
                            b =>
                            {
                                string referenceId = ReadAttribute<string>(
                                    b,
                                    XacmlConstants.AttributeNames.ReferenceId);
                                b.Read();
                                return referenceId;
                            },
                            o,
                            isRequired: true);
                        reader.ReadEndElement();
                        return new XacmlContextRequestReference(refer);
                    },
                    reader,
                    isRequired: true);

                reader.ReadEndElement();
            }

            reader.ReadEndElement();

            return result;
        }

        /// <summary>
        /// Parses XACML 3.0 Context Response XML documents.
        /// </summary>
        /// <param name="reader">The XML Reader.</param>
        /// <returns>The XacmlContextResponse.</returns>
        public static XacmlContextResponse ReadContextResponse(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Response);

            reader.ReadStartElement(XacmlConstants.ElementNames.Response, Xacml30Constants.NameSpaces.Policy);

            List<XacmlContextResult> results = new List<XacmlContextResult>();
            ReadList(results, XacmlConstants.ElementNames.Result, Xacml30Constants.NameSpaces.Policy, ReadContextResult, reader, isRequired: true);

            XacmlContextResponse result = new XacmlContextResponse(results);

            reader.ReadEndElement();

            return result;
        }

        /// <summary>
        /// Parses a XMLContextResult.
        /// </summary>
        /// <param name="reader">The XML Reader.</param>
        /// <returns>The XacmlContext result.</returns>
        private static XacmlContextResult ReadContextResult(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));

            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Result);

            string resourceId = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.ResourceId, isRequered: false);

            reader.ReadStartElement(XacmlConstants.ElementNames.Result, Xacml30Constants.NameSpaces.Policy);

            // Read elements
            XacmlContextResult result = new XacmlContextResult(ReadRequired(XacmlConstants.ElementNames.Decision, Xacml30Constants.NameSpaces.Policy, ReadContextDecision, reader))
            {
                Status = ReadOptional(XacmlConstants.ElementNames.Status, Xacml30Constants.NameSpaces.Policy, ReadContextStatus, reader),
                ResourceId = resourceId,
            };

            if (reader.IsStartElement(XacmlConstants.ElementNames.Obligations, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.Obligations, Xacml30Constants.NameSpaces.Policy);

                ReadList<XacmlObligation>(result.Obligations, XacmlConstants.ElementNames.Obligation, Xacml30Constants.NameSpaces.Policy, ReadObligation, reader, isRequired: true);

                // end obligations
                reader.ReadEndElement();
            }

            if (reader.IsStartElement(XacmlConstants.ElementNames.AssociatedAdvice, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.AssociatedAdvice, Xacml30Constants.NameSpaces.Policy);

                ReadList<XacmlAdvice>(result.Advices, XacmlConstants.ElementNames.Advice, Xacml30Constants.NameSpaces.Policy, ReadAdvice, reader, isRequired: true);

                // end advice
                reader.ReadEndElement();
            }

            ReadList<XacmlContextAttributes>(result.Attributes, XacmlConstants.ElementNames.Attributes, Xacml30Constants.NameSpaces.Policy, ReadContextAttributes, reader, isRequired: false);

            if (reader.IsStartElement(XacmlConstants.ElementNames.PolicyIdentifierList, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.PolicyIdentifierList, Xacml30Constants.NameSpaces.Policy);

                IDictionary<Tuple<string, string>, Action> dicts = new Dictionary<Tuple<string, string>, Action>()
                {
                    { new Tuple<string, string>(XacmlConstants.ElementNames.PolicyIdReference, Xacml30Constants.NameSpaces.Policy), () => result.PolicyIdReferences.Add(ReadPolicyIdReference_3_0(reader)) },
                    { new Tuple<string, string>(XacmlConstants.ElementNames.PolicySetIdReference, Xacml30Constants.NameSpaces.Policy), () => result.PolicySetIdReferences.Add(ReadPolicySetIdReference_3_0(reader)) },
                };

                ReadChoiceElements(reader, dicts);

                reader.ReadEndElement();
            }

            reader.ReadEndElement();

            return result;
        }

        private static XacmlAdvice ReadAdvice(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Advice);

            Uri adviceId = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.AdviceId);

            reader.ReadStartElement(XacmlConstants.ElementNames.Advice, Xacml30Constants.NameSpaces.Policy);

            List<XacmlAttributeAssignment> assigments = new List<XacmlAttributeAssignment>();
            ReadList(assigments, XacmlConstants.ElementNames.AttributeAssignment, Xacml30Constants.NameSpaces.Policy, ReadAttributeAssigment, reader, isRequired: true);

            reader.ReadEndElement();

            return new XacmlAdvice(adviceId, assigments);
        }

        private static XacmlAttributeAssignment ReadAttributeAssigment(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.AttributeAssignment);

            Uri dataType = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.DataType);
            Uri attributeId = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.AttributeId);

            Uri category = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.Category, isRequered: false);
            string issuer = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Issuer, isRequered: false);

            reader.ReadStartElement(XacmlConstants.ElementNames.AttributeAssignment, Xacml30Constants.NameSpaces.Policy);
            string content = reader.ReadContentAsString();
            reader.ReadEndElement();

            return new XacmlAttributeAssignment(attributeId, dataType, content)
            {
                Category = category,
                Issuer = issuer,
            };
        }

        private static XacmlContextPolicyIdReference ReadPolicyIdReference_3_0(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.PolicyIdReference);

            string version = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Version, isRequered: false);
            string earliestVersion = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.EarliestVersion, isRequered: false);
            string latestVersion = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.LatestVersion, isRequered: false);

            XacmlContextPolicyIdReference result = new XacmlContextPolicyIdReference()
            {
                Version = string.IsNullOrEmpty(version) ? null : new XacmlVersionMatchType(version),
                EarliestVersion = string.IsNullOrEmpty(earliestVersion) ? null : new XacmlVersionMatchType(earliestVersion),
                LatestVersion = string.IsNullOrEmpty(latestVersion) ? null : new XacmlVersionMatchType(latestVersion),
            };

            result.Value = reader.ReadInnerXml();
            return result;
        }

        private static XacmlContextPolicySetIdReference ReadPolicySetIdReference_3_0(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.PolicySetIdReference);

            string version = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Version, isRequered: false);
            string earliestVersion = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.EarliestVersion, isRequered: false);
            string latestVersion = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.LatestVersion, isRequered: false);

            XacmlContextPolicySetIdReference result = new XacmlContextPolicySetIdReference()
            {
                Version = string.IsNullOrEmpty(version) ? null : new XacmlVersionMatchType(version),
                EarliestVersion = string.IsNullOrEmpty(earliestVersion) ? null : new XacmlVersionMatchType(earliestVersion),
                LatestVersion = string.IsNullOrEmpty(latestVersion) ? null : new XacmlVersionMatchType(latestVersion),
            };

            result.Value = reader.ReadInnerXml();
            return result;
        }

        private static XacmlObligation ReadObligation(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Obligation);

            Uri obligationId = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.ObligationId);

            string fulFillOn = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.FulfillOn);
            XacmlEffectType effectType = XacmlEffectType.Deny;
            if (string.Equals(fulFillOn, "Deny", StringComparison.OrdinalIgnoreCase))
            {
                effectType = XacmlEffectType.Deny;
            }
            else if (string.Equals(fulFillOn, "Permit", StringComparison.OrdinalIgnoreCase))
            {
                effectType = XacmlEffectType.Permit;
            }
            else
            {
                throw ThrowXmlParserException(reader, "Wrong XacmlEffectType value");
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.Obligation, Xacml30Constants.NameSpaces.Policy);

            List<XacmlAttributeAssignment> assigments = new List<XacmlAttributeAssignment>();
            ReadList(assigments, XacmlConstants.ElementNames.AttributeAssignment, Xacml30Constants.NameSpaces.Policy, ReadAttributeAssigment, reader, isRequired: true);

            reader.ReadEndElement();

            return new XacmlObligation(obligationId, effectType, assigments);
        }

        private static XacmlContextAttributes ReadContextAttributes(XmlReader reader)
        {
            if (reader == null)
            {
                throw new ArgumentNullException(nameof(reader));
            }

            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Attributes);

            Uri category = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.Category);
            string id = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Id, namespaceURI: XmlConstants.Namespaces.XmlNamespace, isRequered: false);

            var result = new XacmlContextAttributes(category) { Id = id };

            if (reader.IsEmptyElement)
            {
                reader.Read();
                return result;
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.Attributes, Xacml30Constants.NameSpaces.Policy);

            if (reader.IsStartElement(XacmlConstants.ElementNames.Content, Xacml30Constants.NameSpaces.Policy))
            {
                result.Content = reader.ReadInnerXml();
            }

            ReadList<XacmlAttribute>(result.Attributes, XacmlConstants.ElementNames.Attribute, Xacml30Constants.NameSpaces.Policy, ReadAttribute, reader, false);

            reader.ReadEndElement();

            return result;
        }

        private static XacmlRule ReadRule(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Rule);

            string ruleId = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.RuleId, isRequered: true);
            string effect = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Effect, isRequered: true);

            XacmlEffectType effectType = XacmlEffectType.Deny;

            if (!Enum.TryParse<XacmlEffectType>(effect, true, out effectType))
            {
                throw ThrowXmlParserException(reader, "Wrong XacmlEffectType value");
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.Rule, Xacml30Constants.NameSpaces.Policy);

            string description = null;
            if (reader.IsStartElement(XacmlConstants.ElementNames.Description, Xacml30Constants.NameSpaces.Policy))
            {
                description = reader.ReadElementContentAsString(XacmlConstants.ElementNames.Description, Xacml30Constants.NameSpaces.Policy);
            }

            XacmlTarget target = null;
            if (reader.IsStartElement(XacmlConstants.ElementNames.Target, Xacml30Constants.NameSpaces.Policy))
            {
                target = ReadTarget(reader);
            }

            XacmlExpression condition = null;
            if (reader.IsStartElement(XacmlConstants.ElementNames.Condition, Xacml30Constants.NameSpaces.Policy))
            {
                condition = ReadCondition(reader);
            }

            XacmlRule result = new XacmlRule(ruleId, effectType) { Description = description, Target = target, Condition = condition };
            if (reader.IsStartElement(XacmlConstants.ElementNames.ObligationExpressions, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.ObligationExpressions, Xacml30Constants.NameSpaces.Policy);
                ReadList(result.Obligations, XacmlConstants.ElementNames.ObligationExpression, Xacml30Constants.NameSpaces.Policy, ReadObligationExpression, reader, isRequired: true);
                reader.ReadEndElement();
            }

            if (reader.IsStartElement(XacmlConstants.ElementNames.AdviceExpressions, Xacml30Constants.NameSpaces.Policy))
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.AdviceExpressions, Xacml30Constants.NameSpaces.Policy);
                ReadList(result.Advices, XacmlConstants.ElementNames.AdviceExpression, Xacml30Constants.NameSpaces.Policy, ReadAdviceExpression, reader, isRequired: true);
                reader.ReadEndElement();
            }

            reader.ReadEndElement();
            return result;
        }

        private static XacmlAdviceExpression ReadAdviceExpression(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.AdviceExpression);

            string appliesTo = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.AppliesTo);

            XacmlEffectType effectType = XacmlEffectType.Deny;

            if (!Enum.TryParse<XacmlEffectType>(appliesTo, true, out effectType))
            {
                throw ThrowXmlParserException(reader, "Wrong XacmlEffectType value");
            }

            XacmlAdviceExpression result = new XacmlAdviceExpression(
                ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.AdviceId),
                effectType);

            reader.ReadStartElement(XacmlConstants.ElementNames.AdviceExpression, Xacml30Constants.NameSpaces.Policy);

            ReadList<XacmlAttributeAssignmentExpression>(result.AttributeAssignmentExpressions, XacmlConstants.ElementNames.AttributeAssignmentExpression, Xacml30Constants.NameSpaces.Policy, ReadAttributeAssignmentExpression, reader, isRequired: false);

            reader.ReadEndElement();

            return result;
        }

        private static XacmlObligationExpression ReadObligationExpression(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.ObligationExpression);

            string fulFillOn = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.FulfillOn);
            XacmlEffectType effectType = XacmlEffectType.Deny;

            if (!Enum.TryParse<XacmlEffectType>(fulFillOn, true, out effectType))
            {
                throw ThrowXmlParserException(reader, "Wrong XacmlEffectType value");
            }

            XacmlObligationExpression result = new XacmlObligationExpression(ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.ObligationId), effectType);

            reader.ReadStartElement(XacmlConstants.ElementNames.ObligationExpression, Xacml30Constants.NameSpaces.Policy);

            ReadList<XacmlAttributeAssignmentExpression>(result.AttributeAssignmentExpressions, XacmlConstants.ElementNames.AttributeAssignmentExpression, Xacml30Constants.NameSpaces.Policy, ReadAttributeAssignmentExpression, reader, isRequired: false);

            reader.ReadEndElement();

            return result;
        }

        private static XacmlContextStatus ReadContextStatus(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Status);

            reader.ReadStartElement(XacmlConstants.ElementNames.Status, Xacml30Constants.NameSpaces.Policy);

            // Read elements
            XacmlContextStatus result = new XacmlContextStatus(ReadRequired(XacmlConstants.ElementNames.StatusCode, Xacml30Constants.NameSpaces.Policy, ReadContextStatusCode, reader))
            {
                StatusMessage = ReadOptional(XacmlConstants.ElementNames.StatusMessage, Xacml30Constants.NameSpaces.Policy, ReadContextStatusMessage, reader)
            };

            if (reader.IsStartElement(XacmlConstants.ElementNames.StatusDetail, Xacml30Constants.NameSpaces.Policy))
            {
                bool isEmptyElement = reader.IsEmptyElement;

                if (isEmptyElement)
                {
                    reader.Read();
                }
                else
                {
                    XmlDocument document = new XmlDocument
                    {
                        PreserveWhitespace = true
                    };
                    document.Load(reader.ReadSubtree());
                    foreach (XmlElement element in document.DocumentElement.ChildNodes)
                    {
                        result.StatusDetail.Add(element);
                    }

                    reader.ReadEndElement();
                }
            }

            reader.ReadEndElement();

            return result;
        }

        private static string ReadContextStatusMessage(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.StatusMessage);

            reader.ReadStartElement(XacmlConstants.ElementNames.StatusMessage, Xacml30Constants.NameSpaces.Policy);

            if (reader.IsEmptyElement)
            {
                reader.Read();
                return string.Empty;
            }

            string result = reader.ReadContentAsString();
            reader.ReadEndElement();
            return result;
        }

        private static XacmlContextStatusCode ReadContextStatusCode(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.StatusCode);

            // Read attributes
            Uri statusCode = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.Value, isRequered: true);

            XacmlContextStatusCode result = new XacmlContextStatusCode(statusCode);
            if (reader.IsEmptyElement)
            {
                reader.Read();
                return result;
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.StatusCode, Xacml30Constants.NameSpaces.Policy);

            // Read elements
            result.StatusCode = ReadOptional(XacmlConstants.ElementNames.StatusCode, Xacml30Constants.NameSpaces.Policy, ReadContextStatusCode, reader);

            reader.ReadEndElement();

            return result;
        }

        private static XacmlAttributeAssignmentExpression ReadAttributeAssignmentExpression(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.AttributeAssignmentExpression);

            Uri attributeId = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.AttributeId);
            Uri category = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.Category, isRequered: false);
            string issuer = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Issuer, isRequered: false);

            reader.ReadStartElement(XacmlConstants.ElementNames.AttributeAssignmentExpression, Xacml30Constants.NameSpaces.Policy);

            XacmlAttributeAssignmentExpression result = new XacmlAttributeAssignmentExpression(attributeId, ReadExpressionType(reader)) { Issuer = issuer, Category = category };

            reader.ReadEndElement();

            return result;
        }

        private static IXacmlExpression ReadExpressionType(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));

            // move to first element
            reader.IsStartElement("*");

            IXacmlExpression result;

            if (reader.IsStartElement(XacmlConstants.ElementNames.VariableReference, Xacml30Constants.NameSpaces.Policy))
            {
                result = ReadOptional(
                        XacmlConstants.ElementNames.VariableReference,
                        Xacml30Constants.NameSpaces.Policy,
                        new ReadElement<XacmlVariableReference>(
                            o =>
                            {
                                string res = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.VariableId);
                                reader.Read();
                                return new XacmlVariableReference(res);
                            }),
                        reader);
            }
            else if (reader.IsStartElement(XacmlConstants.ElementNames.AttributeSelector, Xacml30Constants.NameSpaces.Policy))
            {
                result = ReadOptional(XacmlConstants.ElementNames.AttributeSelector, Xacml30Constants.NameSpaces.Policy, ReadAttributeSelector, reader);
            }
            else if (reader.IsStartElement(XacmlConstants.ElementNames.AttributeDesignator, Xacml30Constants.NameSpaces.Policy))
            {
                result = ReadOptional(XacmlConstants.ElementNames.AttributeDesignator, Xacml30Constants.NameSpaces.Policy, ReadAttributeDesignator, reader);
            }
            else if (reader.IsStartElement(XacmlConstants.ElementNames.AttributeValue, Xacml30Constants.NameSpaces.Policy))
            {
                result = ReadOptional(XacmlConstants.ElementNames.AttributeValue, Xacml30Constants.NameSpaces.Policy, ReadAttributeValue, reader);
            }
            else if (reader.IsStartElement(XacmlConstants.ElementNames.Function, Xacml30Constants.NameSpaces.Policy))
            {
                result = ReadOptional(XacmlConstants.ElementNames.Function, Xacml30Constants.NameSpaces.Policy, ReadFunction, reader);
            }
            else if (reader.IsStartElement(XacmlConstants.ElementNames.Apply, Xacml30Constants.NameSpaces.Policy))
            {
                result = ReadOptional(XacmlConstants.ElementNames.Apply, Xacml30Constants.NameSpaces.Policy, ReadApply, reader);
            }
            else
            {
                throw ThrowXmlParserException(reader, "Wrong VariableDefinition element content");
            }

            return result;
        }

        private static XacmlExpression ReadCondition(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Condition);

            reader.ReadStartElement(XacmlConstants.ElementNames.Condition, Xacml30Constants.NameSpaces.Policy);

            XacmlExpression condition = new XacmlExpression()
            {
                Property = ReadExpressionType(reader)
            };

            reader.ReadEndElement();
            return condition;
        }

        private static XacmlAttribute ReadXacmlAttribute(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.VariableDefinition);

            XacmlAttribute result = new XacmlAttribute(
                ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.AttributeId),
                ReadAttribute<bool>(reader, XacmlConstants.AttributeNames.IncludeInResult))
            {
                Issuer = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Issuer, isRequered: false)
            };

            reader.ReadStartElement(XacmlConstants.ElementNames.Attribute, Xacml30Constants.NameSpaces.Policy);

            ReadList<XacmlAttributeValue>(result.AttributeValues, XacmlConstants.ElementNames.AttributeValue, Xacml30Constants.NameSpaces.Policy, ReadAttributeValue, reader, isRequired: true);

            reader.ReadEndElement();

            return result;
        }

        private static XacmlVariableDefinition ReadVariableDefinition(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.VariableDefinition);

            string variableId = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.VariableId);

            XacmlVariableDefinition result = new XacmlVariableDefinition(variableId);
            if (reader.IsEmptyElement)
            {
                return result;
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.VariableDefinition, Xacml30Constants.NameSpaces.Policy);

            switch (reader.Name)
            {
                case XacmlConstants.ElementNames.VariableReference:
                    result.Property = ReadOptional(
                        XacmlConstants.ElementNames.VariableReference,
                        Xacml30Constants.NameSpaces.Policy,
                        new ReadElement<XacmlVariableReference>(
                            o => new XacmlVariableReference(
                                ReadAttribute<string>(
                                    reader, XacmlConstants.AttributeNames.VariableId))),
                        reader);
                    break;
                case XacmlConstants.ElementNames.AttributeSelector:
                    result.Property = ReadOptional(XacmlConstants.ElementNames.AttributeSelector, Xacml30Constants.NameSpaces.Policy, ReadAttributeSelector, reader);
                    break;
                case XacmlConstants.ElementNames.ResourceAttributeDesignator:
                    result.Property = ReadOptional(XacmlConstants.ElementNames.ResourceAttributeDesignator, Xacml30Constants.NameSpaces.Policy, ReadAttributeDesignator, reader);
                    break;
                case XacmlConstants.ElementNames.ActionAttributeDesignator:
                    result.Property = ReadOptional(XacmlConstants.ElementNames.ActionAttributeDesignator, Xacml30Constants.NameSpaces.Policy, ReadAttributeDesignator, reader);
                    break;
                case XacmlConstants.ElementNames.EnvironmentAttributeDesignator:
                    result.Property = ReadOptional(XacmlConstants.ElementNames.EnvironmentAttributeDesignator, Xacml30Constants.NameSpaces.Policy, ReadAttributeDesignator, reader);
                    break;
                case XacmlConstants.ElementNames.SubjectAttributeDesignator:
                    result.Property = ReadOptional(XacmlConstants.ElementNames.SubjectAttributeDesignator, Xacml30Constants.NameSpaces.Policy, ReadAttributeDesignator, reader);
                    break;
                case XacmlConstants.ElementNames.AttributeValue:
                    result.Property = ReadOptional(XacmlConstants.ElementNames.AttributeValue, Xacml30Constants.NameSpaces.Policy, ReadAttributeValue, reader);
                    break;
                case XacmlConstants.ElementNames.Function:
                    result.Property = ReadOptional(XacmlConstants.ElementNames.Function, Xacml30Constants.NameSpaces.Policy, ReadFunction, reader);
                    break;
                case XacmlConstants.ElementNames.Apply:
                    result.Property = ReadOptional(XacmlConstants.ElementNames.Apply, Xacml30Constants.NameSpaces.Policy, ReadApply, reader);
                    break;
                default:
                    throw ThrowXmlParserException(reader, "Wrong VariableDefinition element content");
            }

            reader.ReadEndElement();

            return result;
        }

        private static XacmlApply ReadApply(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Apply);

            Uri functionId = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.FunctionId);

            reader.ReadStartElement(XacmlConstants.ElementNames.Apply, Xacml30Constants.NameSpaces.Policy);

            XacmlApply apply = new XacmlApply(functionId);

            IDictionary<Tuple<string, string>, Action> dicts = new Dictionary<Tuple<string, string>, Action>()
            {
                { new Tuple<string, string>(XacmlConstants.ElementNames.Apply, Xacml30Constants.NameSpaces.Policy), () => apply.Parameters.Add(ReadApply(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.Function, Xacml30Constants.NameSpaces.Policy), () => apply.Parameters.Add(ReadFunction(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.AttributeValue, Xacml30Constants.NameSpaces.Policy), () => apply.Parameters.Add(ReadAttributeValue(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.SubjectAttributeDesignator, Xacml30Constants.NameSpaces.Policy), () => apply.Parameters.Add(ReadAttributeDesignator(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.ResourceAttributeDesignator, Xacml30Constants.NameSpaces.Policy), () => apply.Parameters.Add(ReadAttributeDesignator(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.ActionAttributeDesignator, Xacml30Constants.NameSpaces.Policy), () => apply.Parameters.Add(ReadAttributeDesignator(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.AttributeDesignator, Xacml30Constants.NameSpaces.Policy), () => apply.Parameters.Add(ReadAttributeDesignator(reader)) },
                { new Tuple<string, string>(XacmlConstants.ElementNames.AttributeSelector, Xacml30Constants.NameSpaces.Policy), () => apply.Parameters.Add(ReadAttributeSelector(reader)) },
            };

            ReadChoiceElements(reader, dicts);

            reader.ReadEndElement();

            return apply;
        }

        private static XacmlFunction ReadFunction(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Function);

            Uri functionId = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.FunctionId);

            XacmlFunction func = new XacmlFunction(functionId);
            reader.Read();
            return func;
        }

        private static XacmlRuleCombinerParameters ReadRuleCombinerParameters(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.RuleCombinerParameters);

            string ruleIdRef = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.RuleIdRef);

            reader.ReadStartElement(XacmlConstants.ElementNames.RuleCombinerParameters, Xacml30Constants.NameSpaces.Policy);

            XacmlRuleCombinerParameters par = new XacmlRuleCombinerParameters(ruleIdRef);

            ReadList(par.CombinerParameters, XacmlConstants.ElementNames.CombinerParameter, Xacml30Constants.NameSpaces.Policy, ReadCombinerParameter, reader);

            reader.ReadEndElement();

            return par;
        }

        /// <summary>
        /// This method reads choice elements.
        /// </summary>
        /// <param name="reader">The XML Reader.</param>
        /// <param name="readerActions">A dictionary with actions to be used on different element types.</param>
        /// <param name="isRequired">Defines if it is a required parameter.</param>
        private static void ReadChoiceElements(XmlReader reader, IDictionary<Tuple<string, string>, Action> readerActions, bool isRequired = false)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            Guard.ArgumentNotNull(readerActions, nameof(readerActions));

            if (isRequired && (reader.NodeType == XmlNodeType.EndElement))
            {
                throw new XmlException(reader.Name + " is empty");
            }

            while (reader.NodeType != XmlNodeType.EndElement)
            {
                if (!ReadChoiceElement(reader, readerActions, isRequired))
                {
                   break;
                }
            }
        }

        /// <summary>
        /// This method uses a dictionary with different actions to read choice elements.
        /// </summary>
        /// <param name="reader">The Xml reader</param>
        /// <param name="actions">The actions to be used for reading a element.</param>
        /// <param name="isRequired">Defines if element is required.</param>
        /// <returns>Boolean value to tell if choice elements can be read.</returns>
        private static bool ReadChoiceElement(XmlReader reader, IDictionary<Tuple<string, string>, Action> actions, bool isRequired = false)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            Guard.ArgumentNotNull(actions, nameof(actions));

            bool elementExist = false;
            foreach (KeyValuePair<Tuple<string, string>, Action> elementType in actions)
            {
                if (reader.IsStartElement(elementType.Key.Item1, elementType.Key.Item2))
                {
                    elementExist = true;
                    elementType.Value();
                    return true;
                }
            }

            if (isRequired && !elementExist)
            {
                throw ThrowXmlParserException(reader, "Unknown element " + reader.LocalName);
            }
            else
            {
                return false;
            }
        }

        private static XacmlTarget ReadTarget(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Target);

            if (reader.IsEmptyElement)
            {
                reader.Read();
                return new XacmlTarget(null);
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.Target, Xacml30Constants.NameSpaces.Policy);

            XacmlTarget target = new XacmlTarget(null);

            // AnyOf
            if (!reader.IsStartElement(XacmlConstants.ElementNames.AnyOf, Xacml30Constants.NameSpaces.Policy))
            {
                throw ThrowXmlParserException(reader, "Target should contain AnyOf or be empty");
            }

            ReadList<XacmlAnyOf>(
                target.AnyOf,
                XacmlConstants.ElementNames.AnyOf,
                Xacml30Constants.NameSpaces.Policy,
                a =>
                {
                    a.ReadStartElement(XacmlConstants.ElementNames.AnyOf, Xacml30Constants.NameSpaces.Policy);
                    ICollection<XacmlAllOf> am = new List<XacmlAllOf>();
                    ReadList<XacmlAllOf>(
                        am,
                        XacmlConstants.ElementNames.AllOf,
                        Xacml30Constants.NameSpaces.Policy,
                        nodeReader =>
                        {
                            nodeReader.ReadStartElement(XacmlConstants.ElementNames.AllOf, Xacml30Constants.NameSpaces.Policy);
                            ICollection<XacmlMatch> m = new List<XacmlMatch>();
                            ReadList<XacmlMatch>(
                                m,
                                XacmlConstants.ElementNames.Match,
                                Xacml30Constants.NameSpaces.Policy,
                                ReadMatch,
                                nodeReader,
                                true);
                            nodeReader.ReadEndElement();
                            return new XacmlAllOf(m);
                        },
                        a,
                        true);
                    a.ReadEndElement();
                    return new XacmlAnyOf(am);
                },
                reader,
                false);

            reader.ReadEndElement();
            return target;
        }

        private static XacmlCombinerParameter ReadCombinerParameter(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.CombinerParameter);

            string parameterName = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.ParameterName);

            reader.ReadStartElement();

            XacmlAttributeValue attr = ReadRequired(XacmlConstants.ElementNames.AttributeValue, ReadAttributeValue, reader);

            reader.ReadEndElement();

            return new XacmlCombinerParameter(parameterName, attr);
        }

        private static XacmlPolicyIssuer ReadPolicyIssuer(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.PolicyIssuer);

            if (reader.IsEmptyElement)
            {
                reader.Read();
                return new XacmlPolicyIssuer();
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.PolicyIssuer, Xacml30Constants.NameSpaces.Policy);

            XacmlPolicyIssuer result = new XacmlPolicyIssuer();

            if (reader.IsStartElement(XacmlConstants.ElementNames.Content, Xacml30Constants.NameSpaces.Policy))
            {
                result.Content = reader.ReadInnerXml();
            }

            ReadList<XacmlAttribute>(result.Attributes, XacmlConstants.ElementNames.Attribute, Xacml30Constants.NameSpaces.Policy, ReadXacmlAttribute, reader, false);

            reader.ReadEndElement();

            return result;
        }

        private static void ReadList<T>(ICollection<T> list, string elementName, string elementNamespace, ReadElement<T> readFunction, XmlReader reader, bool isRequired = false)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            Guard.ArgumentNotNull(elementName, nameof(elementName));
            Guard.ArgumentNotNull(readFunction, nameof(readFunction));
            Guard.ArgumentNotNull(list, nameof(list));

            if (isRequired && !reader.IsStartElement(elementName, elementNamespace))
            {
                throw new XmlException("A least 1 " + elementName + " is required");
            }

            while (reader.IsStartElement(elementName, elementNamespace))
            {
                T elem = ReadOptional(elementName, elementNamespace, readFunction, reader);
                list.Add(elem);
            }
        }

        private static XacmlMatch ReadMatch(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Match);

            string matchId = reader.GetAttribute("MatchId");
            if (string.IsNullOrEmpty(matchId))
            {
                throw ThrowXmlParserException(reader, "MatchId IsNullOrEmpty");
            }

            reader.ReadStartElement(XacmlConstants.ElementNames.Match, Xacml30Constants.NameSpaces.Policy);

            var attributeValue = ReadAttributeValue(reader);

            XacmlMatch result;
            if (reader.IsStartElement(XacmlConstants.ElementNames.AttributeDesignator, Xacml30Constants.NameSpaces.Policy))
            {
                var attributeDesignator = ReadAttributeDesignator(reader);
                result = new XacmlMatch(new Uri(matchId, UriKind.RelativeOrAbsolute), attributeValue, attributeDesignator);
            }
            else
            {
                XacmlAttributeSelector attributeSelector = ReadAttributeSelector(reader);
                result = new XacmlMatch(new Uri(matchId, UriKind.RelativeOrAbsolute), attributeValue, attributeSelector);
            }

            reader.ReadEndElement();
            return result;
        }

        private static XacmlAttributeDesignator ReadAttributeDesignator(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.AttributeDesignator);

            Uri attributeId = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.AttributeId);

            Uri dataType = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.DataType);
            bool mustbepresent = ReadAttribute<bool>(reader, XacmlConstants.AttributeNames.MustBePresent);
            Uri category = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.Category);

            // optional fields
            string issuer = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Issuer, isRequered: false);

            if (reader.IsEmptyElement)
            {
                reader.Read();
            }
            else
            {
                reader.ReadStartElement(XacmlConstants.ElementNames.AttributeDesignator, Xacml30Constants.NameSpaces.Policy);
                reader.ReadEndElement();
            }

            return new XacmlAttributeDesignator(category, attributeId, dataType, mustbepresent)
            {
                Issuer = issuer,
            };
        }

        /// <summary>
        /// Reads Attribute Selector Elements from XACML 3.0 Policy
        /// </summary>
        /// <param name="reader">The xml Reader</param>
        /// <returns>A XacmlAttributeSelector</returns>
        private static XacmlAttributeSelector ReadAttributeSelector(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));

            if (!reader.IsStartElement(XacmlConstants.ElementNames.AttributeSelector, Xacml30Constants.NameSpaces.Policy))
            {
                throw ThrowXmlParserException(reader, "AttributeSelector NotStartElement");
            }

            string path = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Path);

            Uri dataType = ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.DataType);

            bool? mustBePresent = ReadAttribute<bool?>(reader, XacmlConstants.AttributeNames.MustBePresent, isRequered: false);

            reader.Read();

            return new XacmlAttributeSelector(path, dataType)
            {
                MustBePresent = mustBePresent,
            };
        }

        private static XacmlAttribute ReadAttribute(XmlReader reader)
        {
            if (reader == null)
            {
                throw new ArgumentNullException(nameof(reader));
            }

            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Attribute);

            XacmlAttribute result = new XacmlAttribute(
                ReadAttribute<Uri>(reader, XacmlConstants.AttributeNames.AttributeId),
                ReadAttribute<bool>(reader, XacmlConstants.AttributeNames.IncludeInResult))
            {
                Issuer = ReadAttribute<string>(reader, XacmlConstants.AttributeNames.Issuer, isRequered: false),
            };

            reader.ReadStartElement(XacmlConstants.ElementNames.Attribute, Xacml30Constants.NameSpaces.Policy);

            ReadList<XacmlAttributeValue>(result.AttributeValues, XacmlConstants.ElementNames.AttributeValue, Xacml30Constants.NameSpaces.Policy, ReadAttributeValue, reader, isRequired: true);

            reader.ReadEndElement();

            return result;
        }

        private static XacmlAttributeValue ReadAttributeValue(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));

            if (!reader.IsStartElement(XacmlConstants.ElementNames.AttributeValue, Xacml30Constants.NameSpaces.Policy))
            {
                throw ThrowXmlParserException(reader, "AttributeValue NotStartElement");
            }

            IDictionary<string, string> attributes = new Dictionary<string, string>();
            var dataType = reader.GetAttribute(XacmlConstants.AttributeNames.DataType);

            if (string.IsNullOrEmpty(dataType))
            {
                throw ThrowXmlParserException(reader, "DataType IsNullOrEmpty");
            }

            while (reader.MoveToNextAttribute())
            {
                attributes.Add(reader.Name, reader.Value);
            }

            reader.MoveToElement();

            string value;
            if (dataType == "http://www.w3.org/2001/XMLSchema#string")
            {
                value = reader.ReadElementContentAsString();
            }
            else
            {
                value = reader.ReadInnerXml();
            }

            XacmlAttributeValue attribute = new XacmlAttributeValue(new Uri(dataType, UriKind.RelativeOrAbsolute), value);

            foreach (KeyValuePair<string, string> item in attributes)
            {
                try
                {
                    attribute.Attributes.Add(new System.Xml.Linq.XAttribute(item.Key, item.Value));
                }
                catch
                {                    
                }
            }

            return attribute;
        }

        private static XacmlContextDecision ReadContextDecision(XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));

            ValidateXacmlPolicyStartElement(reader, XacmlConstants.ElementNames.Decision);

            reader.ReadStartElement(XacmlConstants.ElementNames.Decision, Xacml30Constants.NameSpaces.Policy);

            // Read elements
            string decisionText = reader.ReadContentAsString();
            XacmlContextDecision result;

            if (string.Equals(decisionText, "Deny", StringComparison.OrdinalIgnoreCase))
            {
                result = XacmlContextDecision.Deny;
            }
            else if (string.Equals(decisionText, "Permit", StringComparison.OrdinalIgnoreCase))
            {
                result = XacmlContextDecision.Permit;
            }
            else if (string.Equals(decisionText, "Indeterminate", StringComparison.OrdinalIgnoreCase))
            {
                result = XacmlContextDecision.Indeterminate;
            }
            else if (string.Equals(decisionText, "NotApplicable", StringComparison.OrdinalIgnoreCase))
            {
                result = XacmlContextDecision.NotApplicable;
            }
            else
            {
                throw ThrowXmlParserException(reader, "Wrong XacmlContextDecision value");
            }

            reader.ReadEndElement();

            return result;
        }

        #region General xml parsing methods
        private static T ReadOptional<T>(string elementName, string elementNamespace, ReadElement<T> readFunction, XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            Guard.ArgumentNotNull(elementName, nameof(elementName));
            Guard.ArgumentNotNull(readFunction, nameof(readFunction));

            if (!reader.IsStartElement(elementName, elementNamespace))
            {
                return default(T);
            }
            else
            {
                T result = readFunction.Invoke(reader);
                return result;
            }
        }

        private static T ReadRequired<T>(string elementName, ReadElement<T> readFunction, XmlReader reader)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            Guard.ArgumentNotNull(elementName, nameof(elementName));
            Guard.ArgumentNotNull(readFunction, nameof(readFunction));

            if (!reader.IsStartElement(XacmlConstants.ElementNames.ActionAttributeDesignator, Xacml30Constants.NameSpaces.Policy))
            {
                T result = readFunction.Invoke(reader);
                return result;
            }
            else
            {
                throw new XmlException(elementName + " is required");
            }
        }

        private static T ReadAttribute<T>(XmlReader reader, string attribute, string namespaceURI = null, bool isRequered = true)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            Guard.ArgumentNotNull(attribute, nameof(attribute));

            string attributeResult = namespaceURI != null ? reader.GetAttribute(attribute, namespaceURI) : reader.GetAttribute(attribute);
            if (isRequered && string.IsNullOrEmpty(attributeResult))
            {
                throw ThrowXmlParserException(reader, attribute + " IsNullOrEmpty");
            }

            if (string.IsNullOrEmpty(attributeResult))
            {
                return default(T);
            }

            object val;
            if (typeof(T) == typeof(bool?) || typeof(T) == typeof(bool))
            {
                val = XmlConvert.ToBoolean(attributeResult);
            }
            else if (typeof(T) == typeof(Uri))
            {
                val = new Uri(attributeResult, UriKind.RelativeOrAbsolute);
            }
            else if (typeof(T) == typeof(string))
            {
                val = attributeResult;
            }
            else if (typeof(T) == typeof(int?))
            {
                val = XmlConvert.ToInt32(attributeResult);
            }
            else
            {
                throw new NotSupportedException();
            }

            return (T)val;
        }

        private static Exception ThrowXmlParserException(XmlReader reader, string message)
        {
            Guard.ArgumentNotNull(reader, nameof(reader));
            IXmlLineInfo info = reader as IXmlLineInfo;
            return new XmlException(message, null, info != null ? info.LineNumber : 0, info != null ? info.LinePosition : 0);
        }

           /// <summary>
        /// Validates if the next element Xacml XLM is of a given type.
        /// Throws exception if not.
        /// </summary>
        /// <param name="reader">The XML Reader.</param>
        /// <param name="elementName">The name of the element.</param>
        private static void ValidateXacmlPolicyStartElement(XmlReader reader, string elementName)
        {
            if (!reader.IsStartElement(elementName, Xacml30Constants.NameSpaces.Policy))
            {
                throw ThrowXmlParserException(reader, "Invalid XACML Policy " + elementName + " is missing");
            }
        }

        private static T ReadRequired<T>(string elementName, string elementNamespace, ReadElement<T> readFunction, XmlReader reader)
        {
            Guard.ArgumentNotNull(elementName, nameof(elementName));
            Guard.ArgumentNotNull(reader, nameof(reader));
            Guard.ArgumentNotNull(readFunction, nameof(readFunction));

            if (!reader.IsStartElement(XacmlConstants.ElementNames.ActionAttributeDesignator, Xacml30Constants.NameSpaces.Policy))
            {
                T result = readFunction.Invoke(reader);
                return result;
            }
            else
            {
                throw new XmlException(elementName + " is required");
            }
        }

        /// <summary>
        /// Validates that the count of element is not more than 1.
        /// </summary>
        /// <param name="reader">The Xml Reader.</param>
        /// <param name="elementCount">The element count.</param>
        /// <param name="elementName">The element name.</param>
        private static void ValidateNotMoreThanOneElement(XmlReader reader, int elementCount, string elementName)
        {
            if (elementCount > 1)
            {
                throw ThrowXmlParserException(reader, elementName + " count > 1");
            }
        }
        #endregion
    }
}
