using System;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// Utility to match attributes
    /// </summary>
    public static class AttributeMatcher
    {
        /// <summary>
        /// Method to match attributes
        /// </summary>
        /// <param name="policyAttribute">The attribute in policy</param>
        /// <param name="contextRequestAttribute">The attribute in </param>
        /// <param name="matchId">The match parameter</param>
        /// <returns></returns>
        public static bool MatchAttributes(string policyAttribute, string contextRequestAttribute, string matchId)
        {
            Guard.ArgumentNotNull(policyAttribute, nameof(policyAttribute));
            Guard.ArgumentNotNull(contextRequestAttribute, nameof(contextRequestAttribute));
            Guard.ArgumentNotNull(matchId, nameof(matchId));

            bool isMatch;
            switch (matchId)
            {
                case XacmlConstants.MatchTypeIdentifiers.StringEqual:
                    isMatch = MatchStrings(policyAttribute, contextRequestAttribute);
                    break;
                case XacmlConstants.MatchTypeIdentifiers.StringEqualIgnoreCase:
                    isMatch = MatchStringsIgnoreCase(policyAttribute, contextRequestAttribute);
                    break;
                case XacmlConstants.MatchTypeIdentifiers.AnyUriEqual:
                    isMatch = MatchAnyUri(policyAttribute, contextRequestAttribute);
                    break;
                case XacmlConstants.MatchTypeIdentifiers.IntegerOneAndOnly:
                case XacmlConstants.MatchTypeIdentifiers.IntegerEqual:
                    isMatch = MatchInteger(policyAttribute, contextRequestAttribute);
                    break;
                case XacmlConstants.MatchTypeIdentifiers.StringIsIn:
                    isMatch = contextRequestAttribute.Contains(policyAttribute);
                    break;
                case XacmlConstants.MatchTypeIdentifiers.TimeEqual:
                    isMatch = MatchTime(policyAttribute, contextRequestAttribute);
                    break;
                case XacmlConstants.MatchTypeIdentifiers.DateEqual:
                    isMatch = MatchDate(policyAttribute, contextRequestAttribute);
                    break;
                default:
                    throw new NotImplementedException(); 
            }

            return isMatch;
        }

        private static bool MatchStrings(string policyAttribute, string contextRequestAttribute)
        {
            return policyAttribute.Equals(contextRequestAttribute);
        }

        private static bool MatchTime(string policyAttribute, string contextRequestAttribute)
        {
            DateTime policyValue = DateTime.Parse(policyAttribute);
            DateTime requestValue = DateTime.Parse(contextRequestAttribute);

            return policyValue.Equals(requestValue);
        }

        private static bool MatchDate(string policyAttribute, string contextRequestAttribute)
        {
            DateTime policyValue = DateTime.Parse(policyAttribute);
            DateTime requestValue = DateTime.Parse(contextRequestAttribute);

            if (policyValue.Date == requestValue.Date)
            {
                return true;
            }

            return false;
        }

        private static bool MatchStringsIgnoreCase(string policyAttribute, string contextRequestAttribute)
        {
            return policyAttribute.Equals(contextRequestAttribute, StringComparison.OrdinalIgnoreCase);
        }

        private static bool MatchAnyUri(string policyValue, string contextRequestValue)
        {
            Uri policyUri = new Uri(policyValue);
            Uri contextRequestUri = new Uri(contextRequestValue);

            return policyUri.Equals(contextRequestUri);
        }

        private static bool MatchInteger(string policyValue, string contextRequestValue)
        {
            if (!int.TryParse(policyValue, out int policyInteger))
            {
                return false;
            }

            if (!int.TryParse(contextRequestValue, out int contextInteger))
            {
                return false;
            }

            return policyInteger.Equals(contextInteger);
        }
    }
}
