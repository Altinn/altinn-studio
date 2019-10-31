namespace Altinn.Authorization.ABAC
{
    using System;
    using System.Collections.Generic;
    using System.Collections.ObjectModel;
    using System.Linq;
    using System.Xml;
    using Altinn.Authorization.ABAC.Constants;
    using Altinn.Authorization.ABAC.Interface;
    using Altinn.Authorization.ABAC.Xacml;
    using Altinn.Authorization.ABAC.Xacml.JsonProfile;

    /// <summary>
    /// This is the Policy Decision Point performing validation of request against policies.
    /// </summary>
    public class PolicyDecisionPoint
    {
        /// <summary>
        /// Method that validated if the subject is allwoed to perform the requested operation on a given resource.
        /// </summary>
        /// <param name="decisionRequest">The Xacml Context request.</param>
        /// <param name="policy">The relevant policy.</param>
        /// <returns>The decision reponse.</returns>
        public XacmlContextResponse Authorize(XacmlContextRequest decisionRequest, XacmlPolicy policy)
        {
            XacmlContextResult contextResult;

            ICollection<XacmlRule> matchingRules = this.GetMatchingRules(policy, decisionRequest, out bool requiredAttributesMissingFromContextRequest);

            if (requiredAttributesMissingFromContextRequest)
            {
                contextResult = new XacmlContextResult(XacmlContextDecision.Indeterminate)
                {
                    Status = new XacmlContextStatus(XacmlContextStatusCode.MissingAttribute),
                };
                return new XacmlContextResponse(contextResult);
            }

            if (matchingRules == null || matchingRules.Count == 0)
            {
               contextResult = new XacmlContextResult(XacmlContextDecision.NotApplicable)
               {
                   Status = new XacmlContextStatus(XacmlContextStatusCode.Success),
               };

               return new XacmlContextResponse(contextResult);
            }

            XacmlContextDecision overallDecision = XacmlContextDecision.NotApplicable;
            foreach (XacmlRule rule in matchingRules)
            {
                XacmlContextDecision decision;

                // Need to authorize based on the information in the Xacml context request
                XacmlAttributeMatchResult subjectMatchResult = rule.MatchAttributes(decisionRequest, XacmlConstants.MatchAttributeCategory.Subject);
                if (subjectMatchResult.Equals(XacmlAttributeMatchResult.Match))
                {
                    if (rule.Effect.Equals(XacmlEffectType.Permit))
                    {
                        decision = XacmlContextDecision.Permit;
                    }
                    else
                    {
                        decision = XacmlContextDecision.Deny;
                    }
                }
                else if (subjectMatchResult.Equals(XacmlAttributeMatchResult.RequiredAttributeMissing))
                {
                    contextResult = new XacmlContextResult(XacmlContextDecision.Indeterminate)
                    {
                        Status = new XacmlContextStatus(XacmlContextStatusCode.Success),
                    };
                    return new XacmlContextResponse(contextResult);
                }
                else
                {
                    decision = XacmlContextDecision.NotApplicable;
                }

                if ((decision.Equals(XacmlContextDecision.Deny) || decision.Equals(XacmlContextDecision.Permit)) && rule.Condition != null)
                {
                    XacmlAttributeMatchResult conditionDidEvaluate = rule.EvaluateCondition(decisionRequest);

                    if (conditionDidEvaluate.Equals(XacmlAttributeMatchResult.NoMatch))
                    {
                        decision = XacmlContextDecision.NotApplicable;
                    }
                    else if (conditionDidEvaluate.Equals(XacmlAttributeMatchResult.RequiredAttributeMissing))
                    {
                        contextResult = new XacmlContextResult(XacmlContextDecision.Indeterminate)
                        {
                            Status = new XacmlContextStatus(XacmlContextStatusCode.Success),
                        };
                        return new XacmlContextResponse(contextResult);
                    }
                    else if (conditionDidEvaluate.Equals(XacmlAttributeMatchResult.BagSizeConditionFailed))
                    {
                        contextResult = new XacmlContextResult(XacmlContextDecision.Indeterminate)
                        {
                            Status = new XacmlContextStatus(XacmlContextStatusCode.Success),
                        };
                        return new XacmlContextResponse(contextResult);
                    }
                    else if (conditionDidEvaluate.Equals(XacmlAttributeMatchResult.ToManyAttributes))
                    {
                        contextResult = new XacmlContextResult(XacmlContextDecision.Indeterminate)
                        {
                            Status = new XacmlContextStatus(XacmlContextStatusCode.ProcessingError),
                        };
                        return new XacmlContextResponse(contextResult);
                    }
                }

                if (!decision.Equals(XacmlContextDecision.NotApplicable))
                {
                    if (policy.RuleCombiningAlgId.Equals(XacmlConstants.CombiningAlgorithms.RuleDenyOverrides)
                        && decision.Equals(XacmlContextDecision.Deny))
                    {
                        contextResult = new XacmlContextResult(XacmlContextDecision.Deny);
                        break;
                    }
                    else if (decision.Equals(XacmlContextDecision.Permit))
                    {
                        overallDecision = decision;
                    }
                }
            }

            contextResult = new XacmlContextResult(overallDecision)
            {
                Status = new XacmlContextStatus(XacmlContextStatusCode.Success),
            };
            this.AddObligations(policy, contextResult);
            this.AddRequestAttributes(decisionRequest, contextResult);

            return new XacmlContextResponse(contextResult);
        }

        /// <summary>
        /// Returns the list of rules that matched the ContextRequest.
        /// </summary>
        /// <param name="policy">The policy.</param>
        /// <param name="decisionRequest">The decision request.</param>
        /// <param name="requiredAttributeMissing">Tels if a required attribute is missing.</param>
        /// <returns>All rules that are matching.</returns>
        private ICollection<XacmlRule> GetMatchingRules(XacmlPolicy policy, XacmlContextRequest decisionRequest, out bool requiredAttributeMissing)
        {
            ICollection<XacmlRule> matchingRules = new Collection<XacmlRule>();

            requiredAttributeMissing = false;

            foreach (XacmlRule rule in policy.Rules)
            {
                XacmlAttributeMatchResult resourceMatch = rule.MatchAttributes(decisionRequest, XacmlConstants.MatchAttributeCategory.Resource);
                XacmlAttributeMatchResult actionMatch = rule.MatchAttributes(decisionRequest, XacmlConstants.MatchAttributeCategory.Action);

                if (resourceMatch.Equals(XacmlAttributeMatchResult.Match) && actionMatch.Equals(XacmlAttributeMatchResult.Match))
                {
                    matchingRules.Add(rule);
                }
                else if (resourceMatch.Equals(XacmlAttributeMatchResult.RequiredAttributeMissing) || actionMatch.Equals(XacmlAttributeMatchResult.RequiredAttributeMissing))
                {
                    requiredAttributeMissing = true;
                }
            }

            return matchingRules;
        }

        private void AddObligations(XacmlPolicy policy, XacmlContextResult result)
        {
            if (result.Decision.Equals(XacmlContextDecision.Permit))
            {
                if (policy.ObligationExpressions.Count > 0)
                {
                    IEnumerable<XacmlObligationExpression> obligationsWithPermit = policy.ObligationExpressions.Where(o => o.FulfillOn == XacmlEffectType.Permit);
                    foreach (XacmlObligationExpression expression in obligationsWithPermit)
                    {
                        List<XacmlAttributeAssignment> attributeAssignments = new List<XacmlAttributeAssignment>();
                        foreach (XacmlAttributeAssignmentExpression ex in expression.AttributeAssignmentExpressions)
                        {
                            Type applyElemType = ex.Property.GetType();

                            if (applyElemType == typeof(XacmlAttributeValue))
                            {
                                XacmlAttributeValue attributeValue = ex.Property as XacmlAttributeValue;

                                XacmlAttributeAssignment attributeAssignment = new XacmlAttributeAssignment(ex.AttributeId, attributeValue.DataType, attributeValue.Value)
                                {
                                    Category = ex.Category,
                                    Issuer = ex.Issuer,
                                };

                                attributeAssignments.Add(attributeAssignment);
                            }
                        }

                        XacmlObligation obligation = new XacmlObligation(expression.ObligationId, attributeAssignments)
                        {
                            FulfillOn = XacmlEffectType.Permit,
                        };

                        result.Obligations.Add(obligation);
                    }
                }
            }
        }

        private void AddRequestAttributes(XacmlContextRequest decisionRequest, XacmlContextResult result)
        {
            foreach (XacmlContextAttributes attribute in decisionRequest.Attributes)
            {
                bool hasResponseAttributes = false;
                XacmlContextAttributes responseAttribute = new XacmlContextAttributes(attribute.Category) { Content = attribute.Content, Id = attribute.Id };

                foreach (XacmlAttribute atr in attribute.Attributes)
                {
                    if (atr.IncludeInResult)
                    {
                        hasResponseAttributes = true;
                        responseAttribute.Attributes.Add(atr);
                    }
                }

                if (hasResponseAttributes)
                {
                    result.Attributes.Add(responseAttribute);
                }
            }
        }
    }
}
