namespace Altinn.App.Api.Tests.Controllers.TestResources;

public class DummyModel
{
    public string? Name { get; set; }
    public int Age { get; set; }

    /// <summary>
    /// Implement equals for this class
    /// </summary>
    public override bool Equals(object? obj)
    {
        if (obj == null)
        {
            return false;
        }

        DummyModel? dummy = obj as DummyModel;
        if (dummy == null)
        {
            return false;
        }

        return this.Name == dummy.Name && this.Age == dummy.Age;
    }

    public override int GetHashCode()
    {
        throw new NotImplementedException();
    }
}
