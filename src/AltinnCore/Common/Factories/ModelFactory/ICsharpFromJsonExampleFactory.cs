using System;

namespace AltinnCore.Common.Factories.ModelFactory
{
    /// <summary>
    /// The c# from JSON example factory interface.
    /// </summary>
    public interface ICsharpFromJsonExampleFactory
    {
        /// <summary>
        /// The build.
        /// </summary>
        /// <param name="json">
        /// The JSON.
        /// </param>
        /// <returns>
        /// The <see cref="string"/>.
        /// </returns>
        string Build(string json);

        /// <summary>
        /// The build.
        /// </summary>
        /// <param name="json">
        /// The JSON.
        /// </param>
        /// <param name="navneStrategi">
        /// The name strategy.
        /// </param>
        /// <returns>
        /// The <see cref="string"/>.
        /// </returns>
        string Build(string json, Action<CsharpFromJsonExampleFactory.TypeDescription> navneStrategi);
    }
}
