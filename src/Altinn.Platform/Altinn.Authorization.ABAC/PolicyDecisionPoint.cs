using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Security.Claims;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;

namespace Altinn.Authorization.ABAC
{
    /// <summary>
    /// This is the Policy Decision Point performing validation of request against policies
    /// </summary>
    public class PolicyDecisionPoint
    {
        private readonly IContextHandler contextHandler;
        private readonly IPolicyRetrievalPoint prp;
        private readonly IPolicyInformationPoint pip;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyDecisionPoint"/> class.
        /// </summary>
        /// <param name="contextHandler">The configured contexthandler</param>
        /// <param name="prp">The Policy Retrieval Point</param>
        /// <param name="pip">The Policy Information Point</param>
        public PolicyDecisionPoint(IContextHandler contextHandler, IPolicyRetrievalPoint prp, IPolicyInformationPoint pip)
        {
            this.contextHandler = contextHandler;
            this.prp = prp;
            this.pip = pip;
        }

        /// <summary>
        /// Method that validated if the subject is allwoed to perform the requested operation on a given resource
        /// </summary>
        /// <param name="request">The Xacml Context request</param>
        /// <returns></returns>
        public XacmlContextResponse AuthorizeAccess(XacmlContextRequest request)
        {
            XacmlContextResult contextResult;
            request = contextHandler.UpdateContextRequest(request);

            XacmlPolicy policy = prp.GetPolicy(request);
                       
            ClaimsPrincipal principal = pip.GetClaimsPrincipal(request);

            ICollection<XacmlRule> matchingRules = GetMatchingRules(policy, request);

            if (matchingRules == null || matchingRules.Count == 0)
            {
               contextResult = new XacmlContextResult(XacmlContextDecision.NotApplicable);
               return new XacmlContextResponse(contextResult);
            }

            XacmlContextDecision overallDecision = XacmlContextDecision.NotApplicable;
            foreach (XacmlRule rule in matchingRules)
            {
                XacmlContextDecision decision;

                if (principal != null)
                {
                   decision = rule.AuthorizeSubject(principal);
                }
                else
                {
                    // The subject has not been converted to a claims principal, need to authorize based
                    // on the information in the Xacml context request
                    if (rule.MatchAttributes(request, XacmlConstants.MatchAttributeCategory.Subject))
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
                    else
                    {
                        decision = XacmlContextDecision.NotApplicable;
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

            contextResult = new XacmlContextResult(overallDecision);
            AddObligations(policy, contextResult);

            return new XacmlContextResponse(contextResult);
        }

        /// <summary>
        /// Returns the list of rules that matched the ContextRequest
        /// </summary>
        /// <param name="policy">The policy</param>
        /// <param name="request">The context request</param>
        /// <returns></returns>
        private ICollection<XacmlRule> GetMatchingRules(XacmlPolicy policy, XacmlContextRequest request)
        {
            ICollection<XacmlRule> matchingRules = new Collection<XacmlRule>();

            foreach (XacmlRule rule in policy.Rules)
            {
                if (rule.IsTargetResourceMatch(request) && rule.IsTargetActionMatch(request))
                {
                    matchingRules.Add(rule);
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
                            FulfillOn = XacmlEffectType.Permit
                        };

                        result.Obligations.Add(obligation);
                    }
                }
            }
        }
    }
}
