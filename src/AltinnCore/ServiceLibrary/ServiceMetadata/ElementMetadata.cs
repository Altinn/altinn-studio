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
    public string ID { get; set; }

    /// <summary>
    /// Gets or sets the ID of the parent element
    /// </summary>
    public string ParentElement { get; set; }

    /// <summary>
    /// Gets or sets the type of this element
    /// </summary>
    public string TypeName { get; set; }

    /// <summary>
    /// Gets or sets the element name
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// Gets or sets the data binding name for the element (to be used in front end)
    /// </summary>
    public string DataBindingName { get; set; }

    /// <summary>
    /// Gets or sets the element xpath
    /// </summary>
    public string XPath { get; set; }

    /// <summary>
    /// Gets or sets the restrictions for this element (<see cref="Restriction"/>)
    /// </summary>
    public Dictionary<string, Restriction> Restrictions { get; set; }

    /// <summary>
    /// Gets or sets the choices for this element
    /// </summary>
    public CultureDictionary Choices { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="ElementType"/>
    /// </summary>
    [JsonConverter(typeof(StringEnumConverter))]
    public ElementType Type { get; set; }

    /// <summary>
    /// Gets or sets the <see cref="BaseValueType">xsd value type</see> of this element
    /// </summary>
    [JsonConverter(typeof(StringEnumConverter))]
    public BaseValueType? XsdValueType { get; set; }

    /// <summary>
    /// Gets or sets any text associated with this element
    /// </summary>
    public Dictionary<string, string> Texts { get; set; }

    /// <summary>
    /// Gets or sets custom properties for this element
    /// </summary>
    public Dictionary<string, string> CustomProperties { get; set; }

    /// <summary>
    /// Gets or sets the maximum number of times this element can be repeated
    /// </summary>
    public int MaxOccurs { get; set; }

    /// <summary>
    /// Gets or sets the minimum number of times this element can be repeated
    /// </summary>
    public int MinOccurs { get; set; }

    /// <summary>
    /// Gets or sets the XName for this element
    /// </summary>
    public string XName { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether this element is the content of the parent tag
    /// </summary>
    public bool IsTagContent { get; set; }

    /// <summary>
    /// Gets or sets the fixed value of an element
    /// </summary>
    public string FixedValue { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether this element is read only
    /// </summary>
    public bool IsReadOnly { get; set; }
  }
}