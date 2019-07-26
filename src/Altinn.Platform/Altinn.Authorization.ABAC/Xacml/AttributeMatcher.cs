using System;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    public static class AttributeMatcher
    {
        /// <summary>
        /// Method to match attributes
        /// </summary>
        /// <param name="policyAttribute">The attribute in policy</param>
        /// <param name="contextAttribute">The attribute in </param>
        /// <param name="matchId">The match parameter</param>
        /// <returns></returns>
        public static bool MatchAttributes(string policyAttribute, string contextAttribute, string matchId)
        {
            Guard.ArgumentNotNull(policyAttribute, nameof(policyAttribute));
            Guard.ArgumentNotNull(contextAttribute, nameof(contextAttribute));
            Guard.ArgumentNotNull(matchId, nameof(matchId));

            bool isMatch = false;
            switch (matchId)
            {
                case XacmlConstants.MatchTypeIdentifiers.StringEqual:
                    isMatch = MatchStrings(policyAttribute, contextAttribute);
                    break;
                case XacmlConstants.MatchTypeIdentifiers.StringEqualIgnoreCase:
                    isMatch = MatchStrings(policyAttribute, contextAttribute);
                    break;
                default:
                    isMatch = false;
                    break;
            }

            return isMatch;
        }

        private static bool MatchStrings(string value1, string value2)
        {
            return value1.Equals(value2);
        }

        private static bool MatchStringsIgnoreCase(string value1, string value2)
        {
            return value1.Equals(value2, StringComparison.OrdinalIgnoreCase);
        }
    }
}
