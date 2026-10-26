import pytest

from shared.utils.path_utils import repo_owner_and_app_name


@pytest.mark.parametrize(
    ("repo_url", "expected"),
    [
        ("https://dev.altinn.studio/repos/ttd/my-app.git", ("ttd", "my-app")),
        ("http://gitea-proxy:81/kari/my-app.git", ("kari", "my-app")),
        ("http://gitea:3000/ttd/my-app/", ("ttd", "my-app")),
    ],
)
def test_returns_the_last_two_path_segments(repo_url, expected):
    assert repo_owner_and_app_name(repo_url) == expected


@pytest.mark.parametrize("repo_url", ["http://gitea/my-app.git", "http://gitea/ttd/.git", "http://gitea/"])
def test_rejects_a_url_without_an_owner_and_an_app_name(repo_url):
    with pytest.raises(ValueError):
        repo_owner_and_app_name(repo_url)
