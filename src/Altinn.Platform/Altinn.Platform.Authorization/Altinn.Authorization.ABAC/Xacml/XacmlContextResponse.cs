using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.47 Element <Response/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047152
    /// The <Response/> element is an abstraction layer used by the policy language.  Any proprietary system using the XACML specification MUST
    /// transform an XACML context <Response/> element into the form of its authorization decision.
    ///
    /// The<Response/> element encapsulates the authorization decision produced by the PDP.It includes a sequence of one or more results,
    /// with one <Result/> element per requested resource.  Multiple results MAY be returned by some implementations, in particular those
    /// that support the XACML Profile for Requests for Multiple Resources [Multi].  Support for multiple results is OPTIONAL.
    ///
    /// The <Response/> element is of ResponseType complex type.
    /// The<Response/> element contains the following elements:
    /// <Result/> [One to Many]
    /// An authorization decision result.See Section 5.48.
    /// </summary>
    public class XacmlContextResponse
    {
        private readonly ICollection<XacmlContextResult> results = new Collection<XacmlContextResult>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextResponse"/> class.
        /// </summary>
        /// <param name="result">An authorization decision result.See Section 5.48.</param>
        public XacmlContextResponse(XacmlContextResult result)
            : this(new XacmlContextResult[] { result })
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlContextResponse"/> class.
        /// </summary>
        /// <param name="results">List of authorization decision results.See Section 5.48.</param>
        public XacmlContextResponse(IEnumerable<XacmlContextResult> results)
        {
            if (results == null)
            {
                throw new ArgumentNullException(nameof(results));
            }

            foreach (var item in results)
            {
                this.results.Add(item);
            }
        }

        /// <summary>
        /// Gets Collection of authorization decision results.See Section 5.48.
        /// </summary>
        public ICollection<XacmlContextResult> Results
        {
            get
            {
                return this.results;
            }
        }
    }
}
