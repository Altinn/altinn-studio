namespace Altinn.Studio.Designer.Filters.UserRequestContext
{
    public interface IUserRequestContext
    {
        string Org { get; set; }
        string Repo { get; set; }
        string Developer { get; set; }
    }
}
