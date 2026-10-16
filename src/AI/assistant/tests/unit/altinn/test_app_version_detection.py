"""Which Altinn app version a repository targets."""

from __future__ import annotations

from pathlib import Path

from agents.altinn.app_version import (
    V8_PROFILE,
    V9_PROFILE,
    detect_app_major_version,
    detect_app_version_profile,
)


def _write_project_file(repo: Path, package_references: str) -> None:
    project_file = repo / "App" / "App.csproj"
    project_file.parent.mkdir(parents=True, exist_ok=True)
    project_file.write_text(
        f'<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>{package_references}</ItemGroup></Project>',
        encoding="utf-8",
    )


def _package_reference(version: str, package_name: str = "Altinn.App.Api") -> str:
    return f'<PackageReference Include="{package_name}" Version="{version}" />'


def test_detects_v8_from_the_app_library_package(tmp_path: Path):
    _write_project_file(tmp_path, _package_reference("8.7.0"))

    assert detect_app_major_version(str(tmp_path)) == 8


def test_detects_v9_from_a_preview_version(tmp_path: Path):
    _write_project_file(tmp_path, _package_reference("9.0.0-preview.4"))

    assert detect_app_major_version(str(tmp_path)) == 9


def test_detects_v9_from_a_pinned_version(tmp_path: Path):
    _write_project_file(tmp_path, _package_reference("[9.0.0]"))

    assert detect_app_major_version(str(tmp_path)) == 9


def test_detects_v9_from_the_experimental_app_library_package(tmp_path: Path):
    _write_project_file(tmp_path, _package_reference("9.1.0", package_name="Altinn.App.Api.Experimental"))

    assert detect_app_major_version(str(tmp_path)) == 9


def test_ignores_other_packages(tmp_path: Path):
    _write_project_file(
        tmp_path,
        _package_reference("10.0.0", package_name="Microsoft.Extensions.Logging") + _package_reference("9.0.0"),
    )

    assert detect_app_major_version(str(tmp_path)) == 9


def test_falls_back_to_v8_without_an_app_library_package(tmp_path: Path):
    _write_project_file(tmp_path, "")

    assert detect_app_major_version(str(tmp_path)) == 8


def test_falls_back_to_v8_when_the_project_file_is_not_valid_xml(tmp_path: Path):
    project_file = tmp_path / "App" / "App.csproj"
    project_file.parent.mkdir(parents=True)
    project_file.write_text("<Project", encoding="utf-8")

    assert detect_app_major_version(str(tmp_path)) == 8


def test_a_v8_app_gets_the_v8_profile(tmp_path: Path):
    _write_project_file(tmp_path, _package_reference("8.7.0"))

    assert detect_app_version_profile(str(tmp_path)) is V8_PROFILE


def test_a_v9_app_gets_the_v9_profile(tmp_path: Path):
    _write_project_file(tmp_path, _package_reference("9.0.0-preview.4"))

    assert detect_app_version_profile(str(tmp_path)) is V9_PROFILE
