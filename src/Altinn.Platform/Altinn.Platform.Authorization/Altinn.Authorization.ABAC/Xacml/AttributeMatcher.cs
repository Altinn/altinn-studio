using System;
using System.Text.RegularExpressions;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// Utility to match attributes.
    /// </summary>
    public static class AttributeMatcher
    {
        /// <summary>
        /// Method to match attributes.
        /// </summary>
        /// <param name="policyAttribute">The attribute in policy.</param>
        /// <param name="decisionRequestAttribute">The attribute in.</param>
        /// <param name="matchId">The match parameter.</param>
        /// <returns>A boolean to tell if the attributes match.</returns>
        public static bool MatchAttributes(string policyAttribute, string decisionRequestAttribute, string matchId)
        {
            Guard.ArgumentNotNull(policyAttribute, nameof(policyAttribute));
            Guard.ArgumentNotNull(decisionRequestAttribute, nameof(decisionRequestAttribute));
            Guard.ArgumentNotNull(matchId, nameof(matchId));

            bool isMatch;
            switch (matchId)
            {
                case XacmlConstants.AttributeMatchFunction.StringEqual:
                    isMatch = MatchStrings(policyAttribute, decisionRequestAttribute);
                    break;
                case XacmlConstants.AttributeMatchFunction.StringEqualIgnoreCase:
                    isMatch = MatchStringsIgnoreCase(policyAttribute, decisionRequestAttribute);
                    break;
                case XacmlConstants.AttributeMatchFunction.AnyUriEqual:
                    isMatch = MatchAnyUri(policyAttribute, decisionRequestAttribute);
                    break;
                case XacmlConstants.AttributeMatchFunction.IntegerOneAndOnly:
                case XacmlConstants.AttributeMatchFunction.IntegerEqual:
                    isMatch = MatchInteger(policyAttribute, decisionRequestAttribute);
                    break;
                case XacmlConstants.AttributeMatchFunction.StringIsIn:
                    isMatch = decisionRequestAttribute.Contains(policyAttribute);
                    break;
                case XacmlConstants.AttributeMatchFunction.TimeEqual:
                    isMatch = MatchTime(policyAttribute, decisionRequestAttribute);
                    break;
                case XacmlConstants.AttributeMatchFunction.DateEqual:
                    isMatch = MatchDate(policyAttribute, decisionRequestAttribute);
                    break;
                case XacmlConstants.AttributeMatchFunction.DateTimeEqual:
                    isMatch = MatchDateTime(policyAttribute, decisionRequestAttribute);
                    break;
                case XacmlConstants.AttributeMatchFunction.RegexpMatch:
                    isMatch = MatchRegex(policyAttribute, decisionRequestAttribute);
                    break;
                default:
                    throw new NotImplementedException();
            }

            return isMatch;
        }

        private static bool MatchStrings(string policyAttribute, string decisionRequestAttribute)
        {
            return policyAttribute.Equals(decisionRequestAttribute);
        }

        private static bool MatchTime(string policyAttribute, string decisionRequestAttribute)
        {
            DateTime policyValue = DateTime.Parse(policyAttribute);
            DateTime requestValue = DateTime.Parse(decisionRequestAttribute);

            return policyValue.Equals(requestValue);
        }

        private static bool MatchDate(string policyAttribute, string decisionRequestAttribute)
        {
            DateTime policyValue = DateTime.Parse(policyAttribute);
            DateTime requestValue = DateTime.Parse(decisionRequestAttribute);

            if (policyValue.Date == requestValue.Date)
            {
                return true;
            }

            return false;
        }

        private static bool MatchDateTime(string policyAttribute, string decisionRequestAttribute)
        {
            DateTime policyValue = DateTime.Parse(policyAttribute);
            DateTime requestValue = DateTime.Parse(decisionRequestAttribute);

            return policyValue.Equals(requestValue);
        }

        private static bool MatchStringsIgnoreCase(string policyAttribute, string decisionRequestAttribute)
        {
            return policyAttribute.Equals(decisionRequestAttribute, StringComparison.OrdinalIgnoreCase);
        }

        private static bool MatchRegex(string policyAttribute, string decisionRequestAttribute)
        {
            Regex rgx = new Regex(policyAttribute);
            return rgx.IsMatch(decisionRequestAttribute);
        }

        private static bool MatchAnyUri(string policyValue, string decisionRequestValue)
        {
            Uri policyUri = new Uri(policyValue);
            Uri contextRequestUri = new Uri(decisionRequestValue);

            return policyUri.Equals(contextRequestUri);
        }

        private static bool MatchInteger(string policyValue, string decisionRequestValue)
        {
            if (!int.TryParse(policyValue, out int policyInteger))
            {
                return false;
            }

            if (!int.TryParse(decisionRequestValue, out int contextInteger))
            {
                return false;
            }

            return policyInteger.Equals(contextInteger);
        }
    }
}
