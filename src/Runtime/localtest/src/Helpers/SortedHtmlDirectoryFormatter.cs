using System.Text.Encodings.Web;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;

namespace LocalTest.Helpers;

public class SortedHtmlDirectoryFormatter : HtmlDirectoryFormatter
{
    public SortedHtmlDirectoryFormatter() : base(HtmlEncoder.Default) { }

    public override Task GenerateContentAsync(HttpContext context, IEnumerable<IFileInfo> contents)
    {
        var sorted = contents.OrderByDescending(f => f.LastModified);
        return base.GenerateContentAsync(context, sorted);
    }
}
