namespace Altinn.Studio.Designer.Filters.UserRequestContext
{
    public interface IUserRequestContext
    {
        string Org { get; }
        string Repo { get; }
        string Developer { get; }
    }
}
