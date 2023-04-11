using System.IO;
using System.Text;

namespace SharedResources.Tests
{
    /// <summary>
    /// Stringwriter that ensures UTF8 is used.
    /// </summary>
    public class Utf8StringWriter : StringWriter
    {
        // <inheritdoc/>
        public override Encoding Encoding => Encoding.UTF8;
    }
}
