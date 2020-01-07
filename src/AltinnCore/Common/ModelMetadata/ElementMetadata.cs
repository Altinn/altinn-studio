using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace AltinnCore.ServiceLibrary.ServiceMetadata
{
    /// <summary>
    /// Metadata for a given service element
    /// </summary>
    public class ElementMetadata
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ElementMetadata"/> class.
        /// </summary>
        public ElementMetadata()
        {
            CustomProperties = new Dictionary<string, string>();
            Restrictions = new Dictionary<string, Restriction>();
            Texts = new Dictionary<string, string>();
        }

        /// <summary>
        /// Gets or sets the ID of the element
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string ID { get; set; }

        /// <summary>
        /// Gets or sets the ID of the parent element. If a 
        /// </summary>
        [JsonProperty(PropertyName = "parentElement")]
        public string ParentElement { get; set; }

        /// <summary>
        /// Gets or sets the type of this element
        /// </summary>
        [JsonProperty(PropertyName = "typeName")]
        public string TypeName { get; set; }

        /// <summary>
        /// Gets or sets the element name. The Name should not contain '-' 
        /// </summary>
        [JsonProperty(PropertyName = "name")]
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the data binding name for the element. If an DataBindingName is null it cannot be used for a data-field.
        /// It is used by the frontend to filter elements that can be used in single-field ux-components.
        /// </summary>
        [JsonProperty(PropertyName = "dataBindingName")]
        public string DataBindingName { get; set; }

        /// <summary>
        /// Gets or sets the element xpath
        /// </summary>
        [JsonProperty(PropertyName = "xPath")]
        public string XPath { get; set; }

        /// <summary>
        /// Gets or sets the restrictions for this element (<see cref="Restriction"/>)
        /// </summary>
        [JsonProperty(PropertyName = "restrictions")]
        public Dictionary<string, Restriction> Restrictions { get; set; }

        /// <summary>
        /// Gets or sets the choices for this element
        /// </summary>
        [JsonProperty(PropertyName = "choices")]
        public CultureDictionary Choices { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="ElementType"/>
        /// </summary>
        [JsonConverter(typeof(StringEnumConverter))]
        [JsonProperty(PropertyName = "type")]
        public ElementType Type { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="BaseValueType">xsd value type</see> of this element
        /// </summary>
        [JsonConverter(typeof(StringEnumConverter))]
        [JsonProperty(PropertyName = "xsdValueType")]
        public BaseValueType? XsdValueType { get; set; }

        /// <summary>
        /// Gets or sets any text associated with this element
        /// </summary>
        [JsonProperty(PropertyName = "texts")]
        public Dictionary<string, string> Texts { get; set; }

        /// <summary>
        /// Gets or sets custom properties for this element
        /// </summary>
        [JsonProperty(PropertyName = "customProperties")]
        public Dictionary<string, string> CustomProperties { get; set; }

        /// <summary>
        /// Gets or sets the maximum number of times this element can be repeated
        /// </summary>
        [JsonProperty(PropertyName = "maxOccurs")]
        public int MaxOccurs { get; set; }

        /// <summary>
        /// Gets or sets the minimum number of times this element can be repeated
        /// </summary>
        [JsonProperty(PropertyName = "minOccurs")]
        public int MinOccurs { get; set; }

        /// <summary>
        /// Gets or sets the XName for this element. The XML name. 
        /// </summary>
        [JsonProperty(PropertyName = "xName")]
        public string XName { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether this element is the content of the parent tag. Special case of SimpleContent.
        /// </summary>
        [JsonProperty(PropertyName = "isTagContent")]
        public bool IsTagContent { get; set; }

        /// <summary>
        /// Gets or sets the fixed value of an element
        /// </summary>
        [JsonProperty(PropertyName = "fixedValue")]
        public string FixedValue { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether this element is read only
        /// </summary>
        [JsonProperty(PropertyName = "isReadOnly")]
        public bool IsReadOnly { get; set; }

        /// <summary>
        /// The reference to the Xml Schema declaration
        /// </summary>
        [JsonProperty(PropertyName = "xmlSchemaXPath")]
        public string XmlSchemaXPath { get; set; }

        /// <summary>
        /// Used to point to the reference to the Json Schema declaration
        /// </summary>
        [JsonProperty(PropertyName = "jsonSchemaPointer")]
        public string JsonSchemaPointer { get; set; }

        /// <summary>
        /// Used to display the property in a view. Contains name, cardinality and type. Example: melding.person.name: [0..1] string
        /// </summary>
        [JsonProperty(PropertyName = "displayString")]
        public string DisplayString { get; set; }
    }
}
