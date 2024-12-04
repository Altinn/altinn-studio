namespace Altinn.Studio.Designer.Models;

public class Reference
{
    public string Type { get; }
    public string LayoutSetName { get; }
    public string Id { get; }

    public Reference(string type, string layoutSetName, string id)
    {
        Type = type;
        LayoutSetName = layoutSetName;
        Id = id;
    }
}
