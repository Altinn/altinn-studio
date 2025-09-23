namespace Altinn.Platform.Authorization.Constants
{
    /// <summary>
    /// Attribute representations in XACML
    /// </summary>
    public static class XacmlRequestAttribute
    {
        /// <summary>
        /// xacml string that represents org
        /// </summary>
        public const string OrgAttribute = "urn:altinn:org";

        /// <summary>
        /// xacml string that represents app
        /// </summary>
        public const string AppAttribute = "urn:altinn:app";

        /// <summary>
        /// xacml string that represents instanceid
        /// </summary>
        public const string InstanceAttribute = "urn:altinn:instance-id";

        /// <summary>
        /// xacm string that represents appresource
        /// </summary>
        public const string AppResourceAttribute = "urn:altinn:appresource";

        /// <summary>
        /// xacml string that represents task
        /// </summary>
        public const string TaskAttribute = "urn:altinn:task";

        /// <summary>
        /// xacml string that represents end event
        /// </summary>
        public const string EndEventAttribute = "urn:altinn:end-event";

        /// <summary>
        /// xacml string that represents party
        /// </summary>
        public const string PartyAttribute = "urn:altinn:partyid";

        /// <summary>
        /// xacml string that represents organization number 
        /// </summary>
        public const string OrganizationNumberAttribute = "urn:altinn:organization:identifier-no";

        /// <summary>
        /// Legacy xacml string that represents organization number. Can be removed when all peps are updated
        /// </summary>
        public const string LegacyOrganizationNumberAttribute = "urn:altinn:organizationnumber";

        /// <summary>
        /// xacml string that represents organization universally unique identifier
        /// </summary>
        public const string OrganizationUuidAttribute = "urn:altinn:organization:uuid";

        /// <summary>
        /// xacml string that represents user
        /// </summary>
        public const string UserAttribute = "urn:altinn:userid";

        /// <summary>
        /// xacml string that represents role
        /// </summary>
        public const string RoleAttribute = "urn:altinn:rolecode";

        /// <summary>
        /// Digitalt Dodsbo Role Code Attribute match identifier
        /// </summary>
        public const string OedRoleAttribute = "urn:digitaltdodsbo:rolecode";

        /// <summary>
        /// xacml string that represents resource
        /// </summary>
        public const string ResourceRegistryAttribute = "urn:altinn:resource";

        /// <summary>
        /// xacml string that represents a resource instance
        /// </summary>
        public const string ResourceRegistryInstanceAttribute = "urn:altinn:resource:instance-id";

        /// <summary>
        /// xacml string that represents person identifier
        /// </summary>
        public const string PersonIdAttribute = "urn:altinn:person:identifier-no";

        /// <summary>
        /// xacml string that represents person universally unique identifier
        /// </summary>
        public const string PersonUuidAttribute = "urn:altinn:person:uuid";

        /// <summary>
        /// xacml attribute urn prefix that represents system user id
        /// </summary>
        public const string SystemUserIdAttribute = "urn:altinn:systemuser:uuid";
    }
}