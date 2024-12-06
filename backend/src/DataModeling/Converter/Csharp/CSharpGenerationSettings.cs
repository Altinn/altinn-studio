namespace Altinn.Studio.DataModeling.Converter.Csharp
{
    public class CSharpGenerationSettings
    {
        public int IndentSize { get; set; } = 2;

        public string ModelNamespace { get; set; } = "Altinn.App.Models";

        /// <summary>
        /// Create two properties on [XmlText] elements
        /// one called value that is used by xml serialization
        /// and one called valueNullable for json serialization.
        ///
        /// The valueNullable property also used in a `ShouldSerialize` method
        /// on the parent element
        /// </summary>
        public bool XmlTextValueNullableHack { get; set; } = true;

        /// <summary>
        /// Add a ShouldSerialize method for to the parent property for [XmlText] elements when all attibutes are fixed
        /// </summary>
        public bool AddShouldSerializeForTagContent { get; set; } = true;
    }
}
