namespace Altinn.Studio.Designer.Filters.UserRequestContext
{
    public class UserRequestContext : IUserRequestContext
    {
        public string Org { get; set; }
        public string Repo { get; set; }
        public string Developer { get; set; }
    }
}
