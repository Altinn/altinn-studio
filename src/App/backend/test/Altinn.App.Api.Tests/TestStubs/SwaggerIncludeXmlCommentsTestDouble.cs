namespace Altinn.App.Api.Tests.TestStubs;

public class SwaggerIncludeXmlCommentsTestDouble
{
    private readonly List<string> _strings = new();

    private readonly List<bool> _bools = new();

    public void IncludeXmlCommentsTestDouble(string s, bool b)
    {
        _strings.Add(s);
        _bools.Add(b);
    }

    public void IncludeXmlCommentsFailingTestDouble(string s, bool b)
    {
        throw new Exception("xUnit expected exception");
    }

    public List<string> GetStrings()
    {
        return _strings;
    }

    public List<bool> GetBools()
    {
        return _bools;
    }
}
