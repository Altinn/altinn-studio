using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.13 Simple type VersionMatchType
    ///
    /// Elements of this type SHALL contain a restricted regular expression matching a version number (see Section 5.12).
    /// The expression SHALL match versions of a referenced policy or policy set that are acceptable for inclusion in the referencing policy or policy set.
    ///
    /// A version match is '.'-separated, like a version string.  A number represents a direct numeric match.  A '*' means that any single number is valid.  A '+' means that any number, and any subsequent numbers, are valid.
    /// In this manner, the following four patterns would all match the version string '1.2.3': '1.2.3', '1.*.3', '1.2.*' and ‘1.+'.
    /// </summary>
    public class XacmlVersionMatchType
    {
        private readonly string value;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlVersionMatchType"/> class.
        /// </summary>
        /// <param name="value">The varsion match</param>
        public XacmlVersionMatchType(string value)
        {
            if (!Regex.IsMatch(value, @"((\d+|\*)\.)*(\d+|\*|\+)"))
            {
                throw new ArgumentException("Incorrect version format", nameof(value));
            }

            this.value = value;
        }

        /// <summary>
        /// Returns value
        /// </summary>
        /// <returns></returns>
        public override string ToString()
        {
            return this.value;
        }
    }
}
