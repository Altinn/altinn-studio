using System.Text;

namespace WorkflowEngine.EndToEndTests.Fixtures;

public static class TestExtensions
{
    extension(string str)
    {
        public Stream ToJsonStream(Encoding? encoding = null)
        {
            encoding ??= Encoding.UTF8;
            var bytes = encoding.GetBytes(str);
            return new MemoryStream(bytes);
        }
    }
}
