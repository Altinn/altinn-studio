namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.10 Element <PolicySetIdReference/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047115
    /// The <PolicySetIdReference/> element SHALL be used to reference a <PolicySet/> element by id.  If <PolicySetIdReference/> is a URL, then it
    /// MAY be resolvable to the <PolicySet/> element.  However, the mechanism for resolving a policy set reference to the corresponding policy
    /// set is outside the scope of this specification.
    ///
    /// Element <PolicySetIdReference/> is of xacml:IdReferenceType complex type.
    /// IdReferenceType extends the xs:anyURI type with the following attributes:
    ///
    /// Version[Optional]
    /// Specifies a matching expression for the version of the policy set referenced.
    ///
    /// EarliestVersion[Optional]
    /// Specifies a matching expression for the earliest acceptable version of the policy set referenced.
    ///
    /// LatestVersion[Optional]
    /// Specifies a matching expression for the latest acceptable version of the policy set referenced.
    /// The matching operation is defined in Section 5.13.  Any combination of these attributes MAY be present in a<PolicySetIdReference/>.
    /// The referenced policy set MUST match all expressions.If none of these attributes is present, then any version of the policy set is acceptable.
    /// In the case that more than one matching version can be obtained, then the most recent one SHOULD be used.
    /// </summary>
    public class XacmlContextPolicyIdReference
    {
        /// <summary>
        ///  Gets or sets specifies a matching expression for the version of the policy set referenced.
        /// </summary>
        public XacmlVersionMatchType Version { get; set; }

        /// <summary>
        /// Gets or sets specifies a matching expression for the earliest acceptable version of the policy set referenced.
        /// </summary>
        public XacmlVersionMatchType EarliestVersion { get; set; }

        /// <summary>
        /// Gets or sets specifies a matching expression for the latest acceptable version of the policy set referenced.
        /// The matching operation is defined in Section 5.13.  Any combination of these attributes MAY be present in a<PolicySetIdReference/>.
        /// The referenced policy set MUST match all expressions.If none of these attributes is present, then any version of the policy set is acceptable.
        /// In the case that more than one matching version can be obtained, then the most recent one SHOULD be used.
        /// </summary>
        public XacmlVersionMatchType LatestVersion { get; set; }

        /// <summary>
        /// Gets or sets the value.
        /// </summary>
        public string Value { get; set; }
    }
}
