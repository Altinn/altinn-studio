using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.16 Element <CombinerParameters/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047121
    ///
    /// The <CombinerParameters/> element conveys parameters for a policy- or rule-combining algorithm.
    /// If multiple<CombinerParameters/> elements occur within the same policy or policy set, they SHALL be considered equal to
    /// one<CombinerParameters/> element containing the concatenation of all the sequences of <CombinerParameters/> contained in all the
    /// aforementioned<CombinerParameters/> elements, such that the order of occurence of the <CominberParameters/> elements is preserved in the concatenation of the <CombinerParameter/> elements.
    /// Note that none of the combining algorithms specified in XACML 3.0 is parameterized.
    ///
    /// The <CombinerParameters/> element is of CombinerParametersType complex type.
    /// The<CombinerParameters/> element contains the following elements:
    /// <CombinerParameter/> [Any Number]
    /// A single parameter.See Section 5.17.
    /// Support for the<CombinerParameters/> element is optional
    /// </summary>
    public class XacmlCombinerParameters
    {
        private readonly ICollection<XacmlCombinerParameter> combinerParameters = new Collection<XacmlCombinerParameter>();

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlCombinerParameters"/> class.
        /// </summary>
        public XacmlCombinerParameters()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlCombinerParameters"/> class.
        /// </summary>
        /// <param name="paramaters">Collection of XacmlCombinerParameter</param>
        public XacmlCombinerParameters(IEnumerable<XacmlCombinerParameter> paramaters)
        {
            if (paramaters == null)
            {
                throw new ArgumentNullException(nameof(paramaters));
            }

            foreach (var item in paramaters)
            {
                this.combinerParameters.Add(item);
            }
        }

        /// <summary>
        /// Collection of XacmlCombinerParameter
        /// </summary>
        public ICollection<XacmlCombinerParameter> CombinerParameters
        {
            get
            {
                return this.combinerParameters;
            }
        }
    }
}
