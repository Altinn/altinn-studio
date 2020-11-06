using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// Class to override casing in UTF(
    /// </summary>
    public class UpperCaseUTF8Encoding : UTF8Encoding
    {
        /// <inheritdoc/>
        public override string WebName
        {
            get { return base.WebName.ToUpper(); }
        }

        /// <summary>
        /// Upperase version of UTF
        /// </summary>
        public static UpperCaseUTF8Encoding UpperCaseUTF8
        {
            get
            {
                if (upperCaseUtf8Encoding == null)
                {
                    upperCaseUtf8Encoding = new UpperCaseUTF8Encoding();
                }

                return upperCaseUtf8Encoding;
            }
        }

        private static UpperCaseUTF8Encoding upperCaseUtf8Encoding = null;
    }
}
