namespace Altinn.Platform.Authorization.Constants
{
    /// <summary>
    /// Altinn specific XACML constants used for urn identifiers and attributes
    /// </summary>
    public static class AltinnXacmlConstants
    {
        /// <summary>
        /// Altinn specific prefixes
        /// </summary>
        public sealed class Prefixes
        {
            /// <summary>
            /// The Policy Id prefix.
            /// </summary>
            public const string PolicyId = "urn:altinn:policyid:";

            /// <summary>
            /// The Rule Id prefix.
            /// </summary>
            public const string RuleId = "urn:altinn:ruleid:";

            /// <summary>
            /// The Obligation Id prefix.
            /// </summary>
            public const string ObligationId = "urn:altinn:obligationid:";

            /// <summary>
            /// The Obligation Assignment Id prefix.
            /// </summary>
            public const string ObligationAssignmentid = "urn:altinn:obligation-assignmentid:";
        }

        /// <summary>
        /// Match attribute identifiers
        /// </summary>
        public sealed class MatchAttributeIdentifiers
        {
            /// <summary>
            /// Org attribute match indentifier 
            /// </summary>
            public const string OrgAttribute = "urn:altinn:org";

            /// <summary>
            /// App attribute match indentifier 
            /// </summary>
            public const string AppAttribute = "urn:altinn:app";

            /// <summary>
            /// Instance attribute match indentifier 
            /// </summary>
            public const string InstanceAttribute = "urn:altinn:instance-id";

            /// <summary>
            /// App resource attribute match indentifier 
            /// </summary>
            public const string AppResourceAttribute = "urn:altinn:appresource";

            /// <summary>
            /// Task attribute match indentifier 
            /// </summary>
            public const string TaskAttribute = "urn:altinn:task";

            /// <summary>
            /// End-event attribute match indentifier 
            /// </summary>
            public const string EndEventAttribute = "urn:altinn:end-event";

            /// <summary>
            /// Party Id attribute match indentifier 
            /// </summary>
            public const string PartyAttribute = "urn:altinn:partyid";

            /// <summary>
            /// User Id attribute match indentifier 
            /// </summary>>
            public const string UserAttribute = "urn:altinn:userid";

            /// <summary>
            /// Role Code attribute match indentifier 
            /// </summary>
            public const string RoleAttribute = "urn:altinn:rolecode";
        }

        /// <summary>
        /// Attribute categories.
        /// </summary>
        public sealed class MatchAttributeCategory
        {
            /// <summary>
            /// The minimum authentication level category.
            /// </summary>
            public const string MinimumAuthenticationLevel = "urn:altinn:minimum-authenticationlevel";

            /// <summary>
            /// The minimum authentication level for organization category
            /// </summary>
            public const string MinimumAuthenticationLevelOrg = "urn:altinn:minimum-authenticationlevel-org";
        }
    }
}
