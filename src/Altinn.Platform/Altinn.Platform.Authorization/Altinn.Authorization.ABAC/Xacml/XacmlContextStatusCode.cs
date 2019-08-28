using System;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.55 Element <StatusCode/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047160
    ///
    /// The <StatusCode/> element is of StatusCodeType complex type.
    /// The<StatusCode/> element contains the following attributes and elements:
    ///
    /// Value[Required]
    /// See Section B.8 for a list of values.
    ///
    /// <StatusCode/> [Any Number]
    /// Minor status code.This status code qualifies its parent status code.
    /// </summary>
    public class XacmlContextStatusCode
    {
        private Uri value;
        private XacmlContextStatusCode statusCode = null;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextStatusCode"/> class.
        /// </summary>
        /// <param name="value">The status value.</param>
        public XacmlContextStatusCode(string value)
        {
            if (value == null)
            {
                throw new ArgumentNullException(nameof(value));
            }

            this.Value = new Uri(value);
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextStatusCode"/> class.
        /// </summary>
        /// <param name="value">Value as URI</param>
        public XacmlContextStatusCode(Uri value)
        {
            Guard.ArgumentNotNull(value, nameof(value));
            this.Value = value;
        }

        #region Public Static Properties

        /// <summary>
        /// Gets the success status code.
        /// </summary>
        public static XacmlContextStatusCode Success
        {
            get
            {
                return new XacmlContextStatusCode(XacmlConstants.StatusCodes.Success);
            }
        }

        /// <summary>
        /// Gets the missing attribute code.
        /// </summary>
        public static XacmlContextStatusCode MissingAttribute
        {
            get
            {
                return new XacmlContextStatusCode(XacmlConstants.StatusCodes.MissingAttribute);
            }
        }

        /// <summary>
        /// Gets the syntax error code.
        /// </summary>
        public static XacmlContextStatusCode SyntaxError
        {
            get
            {
                return new XacmlContextStatusCode(XacmlConstants.StatusCodes.SyntaxError);
            }
        }

        /// <summary>
        /// Gets the parsing error status code.
        /// </summary>
        public static XacmlContextStatusCode ProcessingError
        {
            get
            {
                return new XacmlContextStatusCode(XacmlConstants.StatusCodes.ProcessingError);
            }
        }

        #endregion Public Static Properties

        /// <summary>
        /// Gets or sets the status value.
        /// </summary>
        public Uri Value
        {
            get
            {
                return this.value;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.value = value;
            }
        }

        /// <summary>
        /// Gets or sets the status code.
        /// </summary>
        public XacmlContextStatusCode StatusCode
        {
            get
            {
                return this.statusCode;
            }

            set
            {
                this.statusCode = value;
            }
        }
    }
}
