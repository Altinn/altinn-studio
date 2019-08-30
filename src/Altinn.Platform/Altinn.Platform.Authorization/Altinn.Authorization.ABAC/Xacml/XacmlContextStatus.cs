using System;
using System.Collections.ObjectModel;
using System.Xml;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.54 Element <Status/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047159
    ///
    /// The <Status/> element represents the status of the authorization decision result.
    ///
    /// The <Status/> element is of StatusType complex type.
    /// The<Status/> element contains the following elements:
    ///
    /// <StatusCode/> [Required]
    /// Status code.
    ///
    /// <StatusMessage/> [Optional]
    /// A status message describing the status code.
    ///
    /// <StatusDetail/> [Optional]
    /// Additional status information.
    /// </summary>
    public class XacmlContextStatus
    {
        private readonly Collection<XmlElement> statusDetail = new Collection<XmlElement>();
        private XacmlContextStatusCode statusCode;
        private string statusMessage;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextStatus"/> class.
        /// </summary>
        /// <param name="statusCode">The status code.</param>
        public XacmlContextStatus(XacmlContextStatusCode statusCode)
        {
            if (statusCode == null)
            {
                throw new ArgumentNullException(nameof(statusCode));
            }

            this.statusCode = statusCode;
        }

        /// <summary>
        /// Gets or sets a status message describing the status code.
        /// </summary>
        public string StatusMessage
        {
            get
            {
                return this.statusMessage;
            }

            set
            {
                this.statusMessage = !string.IsNullOrEmpty(value) ? value : null;
            }
        }

        /// <summary>
        /// 5.57 Element <StatusDetail/>
        /// The <StatusDetail/> element qualifies the <Status/> element with additional information.
        ///
        /// The <StatusDetail/> element is of StatusDetailType complex type.
        /// The<StatusDetail/> element allows arbitrary XML content.
        ///
        /// Inclusion of a <StatusDetail/> element is optional.  However, if a PDP returns one of the following XACML-defined <StatusCode/>
        /// values and includes a <StatusDetail/> element, then the following rules apply.
        /// urn:oasis:names:tc:xacml:1.0:status:ok
        ///
        /// A PDP MUST NOT return a<StatusDetail/> element in conjunction with the “ok” status value.
        /// urn:oasis:names:tc:xacml:1.0:status:missing-attribute
        ///
        /// A PDP MAY choose not to return any<StatusDetail/> information or MAY choose to return a<StatusDetail/> element containing one or more
        /// <MissingAttributeDetail/> elements.
        /// urn:oasis:names:tc:xacml:1.0:status:syntax-error
        ///
        /// A PDP MUST NOT return a<StatusDetail/> element in conjunction with the “syntax-error” status value.  A syntax error may
        /// represent either a problem with the policy being used or with the request context.  The PDP MAY return a<StatusMessage/> describing the problem.
        /// urn:oasis:names:tc:xacml:1.0:status:processing-error
        ///
        /// A PDP MUST NOT return <StatusDetail/> element in conjunction with the “processing-error” status value.  This status code
        /// indicates an internal problem in the PDP.For security reasons, the PDP MAY choose to return no further information to the PEP.
        /// In the case of a divide-by-zero error or other computational error, the PDP MAY return a<StatusMessage/> describing the nature of the error.
        /// </summary>
        public Collection<XmlElement> StatusDetail
        {
            get
            {
                return this.statusDetail;
            }
        }

        /// <summary>
        /// The status code
        /// </summary>
        public XacmlContextStatusCode StatusCode
        {
            get
            {
                return this.statusCode;
            }

            set
            {
                if (value == null)
                {
                    throw new ArgumentNullException(nameof(value));
                }

                this.statusCode = value;
            }
        }
    }
}
