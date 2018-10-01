
namespace AltinnCore.Common.Factories.ModelFactory
{
    public interface IJsonToCsharpClassConfig
    {
        string Namespace { get; set; }

        string MainClass { get; set; }

        bool UseSingleFile { get; set; }
    }
}
