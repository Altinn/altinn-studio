#nullable disable
using System.Text;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// Class to override casing in UTF(
    /// </summary>
    public class UpperCaseUtf8Encoding : UTF8Encoding
    {
        /// <inheritdoc/>
        public override string WebName
        {
            get { return base.WebName.ToUpper(); }
        }

        /// <summary>
        /// Upperase version of UTF
        /// </summary>
        public static UpperCaseUtf8Encoding UpperCaseUTF8
        {
            get
            {
                if (s_upperCaseUtf8Encoding == null)
                {
                    s_upperCaseUtf8Encoding = new UpperCaseUtf8Encoding();
                }

                return s_upperCaseUtf8Encoding;
            }
        }

        private static UpperCaseUtf8Encoding s_upperCaseUtf8Encoding = null;
    }
}
