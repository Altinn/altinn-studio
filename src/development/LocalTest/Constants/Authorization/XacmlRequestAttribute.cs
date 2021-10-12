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
        /// xacml string that represents user
        /// </summary>
        public const string UserAttribute = "urn:altinn:userid";

        /// <summary>
        /// xacml string that represents role
        /// </summary>
        public const string RoleAttribute = "urn:altinn:rolecode";
    }
}
