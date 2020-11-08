using System;
using System.Collections.Generic;
using System.Text;

namespace Designer.Tests.Factories.ModelFactory
{
    public class UpperCaseUTF8Encoding : UTF8Encoding
    {
        public override string WebName
        {
            get { return base.WebName.ToUpper(); }
        }

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
