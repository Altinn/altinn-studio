#nullable enable
namespace LocalTest.Models;

using LocalTest.Services.Tenor.Models;
using LocalTest.Services.TestData;

public class TenorViewModel
{
    public List<TenorFileItem> FileItems { get; set; } = default!;
}

public class TenorFileItem
{
    public string FileName { get; set; } = default!;
    public string RawFileContent { get; set; } = default!;
    public bool Valid => Freg is not null || Brreg is not null;
    public Freg? Freg { get; set; }
    public BrregErFr? Brreg { get; set; }
}