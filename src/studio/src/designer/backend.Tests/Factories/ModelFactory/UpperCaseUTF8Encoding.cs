using System.Text;

namespace Designer.Tests.Factories.ModelFactory
{
    public class UpperCaseUtf8Encoding : UTF8Encoding
    {
        public override string WebName
        {
            get { return base.WebName.ToUpper(); }
        }

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
