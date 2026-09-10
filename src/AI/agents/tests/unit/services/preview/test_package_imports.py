"""The submodule and the function share a name; the function must not shadow it."""

from __future__ import annotations

import inspect


def test_render_check_attribute_is_the_module():
    import agents.services.preview.render_check as rc

    assert inspect.ismodule(rc)


def test_render_check_function_is_reachable_on_the_module():
    import agents.services.preview.render_check as rc

    assert callable(rc.render_check)


def test_package_re_exports_the_engine_symbols_themselves():
    import agents.services.preview as package
    import agents.services.preview.render_check as module

    for name in ("PageRenderResult", "PreviewCheckUnavailable",
                 "read_page_order", "swap_layout_in_preview_url"):
        assert getattr(package, name) is getattr(module, name), name
