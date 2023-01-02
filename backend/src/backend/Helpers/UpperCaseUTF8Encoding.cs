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
                if (upperCaseUtf8Encoding == null)
                {
                    upperCaseUtf8Encoding = new UpperCaseUtf8Encoding();
                }

                return upperCaseUtf8Encoding;
            }
        }

        private static UpperCaseUtf8Encoding upperCaseUtf8Encoding = null;
    }
}
