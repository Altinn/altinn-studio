"""A benchmark item starts from the app template here, so a run travels."""

from __future__ import annotations

import json

import pytest

from benchmarks.base_app import (
    _tracked_files,
    APP_TEMPLATE_VERSIONS,
    materialize_base_app,
    template_app_dir,
)

TEMPLATE_ONLY_FILE = "models/model.schema.json"
FIXTURE = "three-text-fields"


class TestTemplateAppDir:
    @pytest.mark.parametrize("version", APP_TEMPLATE_VERSIONS)
    def test_every_declared_version_exists_in_the_repo(self, version):
        """A version we claim to support but cannot find is a broken benchmark."""
        assert template_app_dir(version).is_dir()

    def test_an_unknown_version_is_rejected(self):
        with pytest.raises(ValueError):
            template_app_dir("v7")


class TestMaterializeBaseApp:
    def test_the_template_alone_is_a_complete_app(self, tmp_path):
        app = materialize_base_app(tmp_path)

        assert (app / TEMPLATE_ONLY_FILE).is_file()
        assert (app / "ui/form/layouts/Side1.json").is_file()

    def test_the_starting_layout_is_empty(self, tmp_path):
        """Items are written against an empty layout; a populated one would
        change what every goal means."""
        app = materialize_base_app(tmp_path)

        layout = json.loads((app / "ui/form/layouts/Side1.json").read_text(encoding="utf-8"))
        assert layout["data"]["layout"] == []

    def test_a_fixture_overlays_the_template(self, tmp_path):
        app = materialize_base_app(tmp_path, fixture=FIXTURE)

        layout = json.loads((app / "ui/form/layouts/Side1.json").read_text(encoding="utf-8"))
        assert [c["id"] for c in layout["data"]["layout"]] == ["Input1", "Input2", "Input3"]

    def test_a_fixture_does_not_have_to_repeat_the_template(self, tmp_path):
        """The point of the overlay: a fixture holds only what it changes."""
        app = materialize_base_app(tmp_path, fixture=FIXTURE)

        assert (app / TEMPLATE_ONLY_FILE).is_file()

    def test_a_missing_fixture_fails_loudly(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            materialize_base_app(tmp_path, fixture="does-not-exist")


class TestOnlyTrackedFilesTravel:
    """The template directory also holds local build output."""

    def test_no_build_output_is_copied(self, tmp_path):
        app_dir = materialize_base_app(tmp_path)

        assert not (app_dir / "obj").exists()
        assert not (app_dir / "bin").exists()

    def test_the_file_set_is_exactly_what_git_tracks(self, tmp_path):
        app_dir = materialize_base_app(tmp_path)
        copied = {p.relative_to(app_dir).as_posix() for p in app_dir.rglob("*") if p.is_file()}

        tracked = {p.as_posix() for p in _tracked_files(template_app_dir())}

        assert copied == tracked
