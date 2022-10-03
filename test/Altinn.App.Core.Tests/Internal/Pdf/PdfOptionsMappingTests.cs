using System.IO;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Pdf.TestDoubles;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Internal.Pdf;

public class PdfOptionsMappingTests
{
    [Fact]
    public async void GetOptionsDictionary_returns_dictionary_for_options_with_mapping()
    {
        IPdfOptionsMapping pdfOptionsMapping = new PdfOptionsMapping(new AppOptionsDouble());
        string formlayout = File.ReadAllText(Path.Combine("Internal", "Pdf", "TestData", "formlayout.json"));
        object o = ReadTestData("data.xml");

        var res = await pdfOptionsMapping.GetOptionsDictionary(formlayout, "nb", o, "512345/cab39d95-7439-4ecb-b908-2fb3726d9295");
        res.Count.Should().Be(2);
        res.Should().ContainKeys("tags", "repdropdown");
        res["tags"].Count.Should().Be(1);
        res["tags"].Should().ContainKey("name");
        res["tags"]["name"].Should().Be("Default-tags-nb");
        res["repdropdown"].Count.Should().Be(1);
        res["repdropdown"].Should().ContainKey("val");
        res["repdropdown"]["val"].Should().Be("1-repdropdown-nb");
    }
    
    [Fact]
    public async void GetOptionsDictionary_returns_dictionary_for_options_without_mapping()
    {
        IPdfOptionsMapping pdfOptionsMapping = new PdfOptionsMapping(new AppOptionsDouble());
        string formlayout = File.ReadAllText(Path.Combine("Internal", "Pdf", "TestData", "formlayout-nomapping.json"));
        object o = ReadTestData("data-nomapping.xml");

        var res = await pdfOptionsMapping.GetOptionsDictionary(formlayout, "nb", o, "512345/cab39d95-7439-4ecb-b908-2fb3726d9295");
        res.Count.Should().Be(1);
        res.Should().ContainKeys("fylker");
        res["fylker"].Count.Should().Be(1);
        res["fylker"].Should().ContainKey("no-mapping");
        res["fylker"]["no-mapping"].Should().Be("fylker-nb");
    }

    private static object ReadTestData(string datafile)
    {
        System.Xml.Serialization.XmlSerializer reader = new System.Xml.Serialization.XmlSerializer(typeof(Skjema));
        using (StreamReader file = new System.IO.StreamReader(Path.Combine("Internal", "Pdf", "TestData", datafile)))
        {
            Skjema s = (Skjema)reader.Deserialize(file);
            file.Close();
            return s;
        }
    }
}