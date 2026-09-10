"""The submodule and the function share a name; the function must not shadow it."""

from __future__ import annotations

import inspect


def test_render_check_attribute_is_the_module():
    import agents.services.preview.render_check as rc

    assert inspect.ismodule(rc)


def test_render_check_function_is_reachable_on_the_module():
    import agents.services.preview.render_check as rc

    assert callable(rc.render_check)


def test_package_still_re_exports_the_other_engine_symbols():
    from agents.services.preview import (
        PageRenderResult,
        PreviewCheckUnavailable,
        read_page_order,
        swap_layout_in_preview_url,
    )

    assert PageRenderResult is not None
    assert PreviewCheckUnavailable is not None
    assert callable(read_page_order)
    assert callable(swap_layout_in_preview_url)
