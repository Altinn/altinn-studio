using System.Collections.Generic;
using System.Text.Json.Serialization;

public class FooterFile
{
    [JsonPropertyName("$schema")]
    public string Schema { get; set; }

    [JsonPropertyName("footer")]
    public List<FooterLayout> Footer { get; set; }
}

public class FooterLayout
{
    [JsonPropertyName("type")]
    public string Type { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("target")]
    public string Target { get; set; }

    [JsonPropertyName("icon")]
    public string Icon { get; set; }
}

public enum FooterComponentType
{
    Email,
    Link,
    Phone,
    Text
}

public enum IconType
{
    Information,
    Email,
    Phone
}

// Specific component classes
public class EmailComponent : FooterFile
{
    [JsonPropertyName("target")]
    public string Target { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; }
}

public class LinkComponent : FooterFile
{
    [JsonPropertyName("target")]
    public string Target { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("icon")]
    public IconType? Icon { get; set; }
}

public class PhoneComponent : FooterFile
{
    [JsonPropertyName("target")]
    public string Target { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; }
}

public class TextComponent : FooterFile
{
    [JsonPropertyName("title")]
    public string Title { get; set; }
}
