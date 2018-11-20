namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    /// Interface for json to csharp conversion
    /// </summary>
    public interface IJsonToCsharpClassConfig
    {
        /// <summary>
        /// Gets or sets namespace configuration
        /// </summary>
        string Namespace { get; set; }

        /// <summary>
        /// Gets or sets main class configuration
        /// </summary>
        string MainClass { get; set; }

        /// <summary>
        /// Gets or sets use single file configuration
        /// </summary>
        bool UseSingleFile { get; set; }
    }
}
