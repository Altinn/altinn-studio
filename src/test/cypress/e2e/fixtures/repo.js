var faker = require('faker');
export const repos = (count) => {
  var userRepos = [];
  faker.seed(100);

  for (var i = 0; i < count; i++) {
    var name = faker.hacker.noun();
    var appOwnerName = faker.name.findName();
    var userRepo = {
      created_at: '2019-11-21T08:28:44Z',
      default_branch: 'master',
      full_name: 'ttd/',
      id: 1020,
      name: name,
      owner: {
        full_name: appOwnerName,
        id: 658,
        login: 'ttd',
      },
      parent: null,
      permissions: {
        admin: true,
        pull: true,
        push: true,
      },
      updated_at: '2019-11-21T08:28:59Z',
    };
    userRepos.push(userRepo);
  }

  return userRepos;
};
