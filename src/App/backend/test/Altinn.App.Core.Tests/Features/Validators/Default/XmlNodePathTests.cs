using System.Xml;
using Altinn.App.Core.Features.Validation.Default;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class XmlNodePathTests
{
    private static readonly XmlDocument _document = LoadDocument(
        """
        <Skjema xmlns="urn:test">
          <melding>
            <name>toolong</name>
            <gruppe id="1"><key>a</key></gruppe>
            <gruppe id="x"><key>b</key><values>v1</values><values>v2</values></gruppe>
            <gruppe><values>only</values></gruppe>
          </melding>
        </Skjema>
        """
    );

    private static XmlDocument LoadDocument(string xml)
    {
        var document = new XmlDocument { XmlResolver = null };
        document.LoadXml(xml);
        return document;
    }

    private static XmlNode Select(string xpath)
    {
        var namespaces = new XmlNamespaceManager(_document.NameTable);
        namespaces.AddNamespace("t", "urn:test");
        return _document.SelectSingleNode(xpath, namespaces) ?? throw new InvalidOperationException(xpath);
    }

    [Theory]
    [InlineData("/t:Skjema", "/Skjema")]
    [InlineData("/t:Skjema/t:melding", "/Skjema/melding")]
    [InlineData("/t:Skjema/t:melding/t:name", "/Skjema/melding/name")]
    [InlineData("/t:Skjema/t:melding/t:gruppe[1]", "/Skjema/melding/gruppe[1]")]
    [InlineData("/t:Skjema/t:melding/t:gruppe[2]/t:key", "/Skjema/melding/gruppe[2]/key")]
    [InlineData("/t:Skjema/t:melding/t:gruppe[2]/t:values[2]", "/Skjema/melding/gruppe[2]/values[2]")]
    [InlineData("/t:Skjema/t:melding/t:gruppe[3]/t:values", "/Skjema/melding/gruppe[3]/values")]
    [InlineData("/t:Skjema/t:melding/t:gruppe[2]/@id", "/Skjema/melding/gruppe[2]/@id")]
    public void Get_ReturnsPathWithIndexesForRepeatedElements(string select, string expected)
    {
        var node = Select(select);

        Assert.Equal(expected, XmlNodePath.Get(node));
    }

    [Fact]
    public void Get_ReturnsNullForNullOrDocument()
    {
        Assert.Null(XmlNodePath.Get(null));
        Assert.Null(XmlNodePath.Get(_document));
    }
}
