#!/usr/bin/env python3
"""Prints what the desktop's applications expose to assistive technology, as a compact tree.

Called by `desktop tree`. Only nodes that are showing on screen are printed, so the tree covers
what a screenshot would, at a fraction of the cost. Boxes are in the pixels of the screenshot the
helper sends, so they can be passed straight back to `desktop click`.

    desktop-tree.py DISPLAY_W DISPLAY_H SENT_W SENT_H [--json] [APPLICATION]
"""

import json
import sys

# Containers that carry no meaning of their own when unnamed: their children are printed in
# their place, one level up.
TRANSPARENT = {
    'filler', 'section', 'panel', 'paragraph', 'form', 'tool bar', 'grouping', 'unknown',
    'redundant object', 'invalid', 'label', 'static', 'block quote', 'list item',
}
# Roles whose text content is the useful part rather than their name.
TEXT_VALUED = {'entry', 'text', 'combo box', 'spin button', 'password text', 'editbar', 'terminal'}
# A terminal's value is its last lines: where the prompt and the latest output are.
TERMINAL_LINES = 4
MAX_NODES = 2000
MAX_TEXT = 80


def fail(message):
    print(f'desktop: {message}', file=sys.stderr)
    sys.exit(1)


def require_accessibility_bus():
    """Fails cleanly when the accessibility bus cannot be reached.

    The AT-SPI library aborts the whole process when it cannot connect, before any Python error
    handling runs, so the bus is asked for its address first. Asking also starts it if the
    session bus has not activated it yet.
    """
    try:
        from gi.repository import Gio, GLib
        bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
        bus.call_sync('org.a11y.Bus', '/org/a11y/bus', 'org.a11y.Bus', 'GetAddress', None,
                      GLib.VariantType.new('(s)'), Gio.DBusCallFlags.NONE, 3000, None)
    except Exception as error:
        message = getattr(error, 'message', None) or str(error)
        fail(f'cannot reach the accessibility bus: {message}; is DBUS_SESSION_BUS_ADDRESS set, '
             'and is agent-desktop-dbus.service running?')


require_accessibility_bus()
try:
    import pyatspi
    from pyatspi import (DESKTOP_COORDS, STATE_CHECKED, STATE_FOCUSED, STATE_PRESSED,
                         STATE_SELECTED, STATE_SHOWING)
except ImportError:
    fail('tree needs python3-pyatspi, which this image does not have')

arguments = sys.argv[1:]
as_json = '--json' in arguments
arguments = [argument for argument in arguments if argument != '--json']
if len(arguments) < 4:
    fail('tree: usage: desktop-tree.py DISPLAY_W DISPLAY_H SENT_W SENT_H [--json] [APPLICATION]')
display_width, display_height, sent_width, sent_height = (int(value) for value in arguments[:4])
wanted = ' '.join(arguments[4:]).lower()
# The image calls its browser `chromium` everywhere else; AT-SPI knows it by its product name.
ALIASES = {'chromium': 'chrome'}


def to_sent(value, sent, actual):
    return value if sent == actual else int(value * sent / actual + 0.5)


def clean(text):
    # U+FFFC stands in for an embedded object in AT-SPI text; it is never something to read.
    text = ' '.join((text or '').replace('\ufffc', ' ').split())
    return text if len(text) <= MAX_TEXT else text[:MAX_TEXT - 1] + '…'


def selected_option(accessible, depth=0):
    """The name of the selected option under a combo box, whose own text is a placeholder."""
    for index in range(accessible.childCount):
        child = accessible.getChildAtIndex(index)
        if child is None:
            continue
        if child.getState().contains(STATE_SELECTED) and child.name:
            return clean(child.name)
        if depth < 2:
            found = selected_option(child, depth + 1)
            if found:
                return found
    return ''


def value_of(accessible, role):
    if role not in TEXT_VALUED:
        return ''
    if role == 'terminal':
        try:
            text = accessible.queryText()
            start = max(0, text.characterCount - 4000)
            lines = [line for line in text.getText(start, text.characterCount).splitlines() if line.strip()]
        except NotImplementedError:
            return ''
        return '\n'.join(clean(line) for line in lines[-TERMINAL_LINES:])
    if role == 'combo box':
        try:
            option = selected_option(accessible)
        except Exception:
            option = ''
        if option:
            return option
    try:
        text = accessible.queryText()
        return clean(text.getText(0, min(text.characterCount, MAX_TEXT * 2)))
    except NotImplementedError:
        return ''


def box_of(accessible):
    try:
        extents = accessible.queryComponent().getExtents(DESKTOP_COORDS)
    except NotImplementedError:
        return None
    if extents.width <= 0 or extents.height <= 0:
        return None
    # Some toolkits, GTK 4 among them, report no screen position at all over X11. A box at the
    # origin would send a click to the corner of the screen, so it is left out instead.
    if extents.x == 0 and extents.y == 0:
        return None
    return {
        'x': to_sent(extents.x, sent_width, display_width),
        'y': to_sent(extents.y, sent_height, display_height),
        'width': to_sent(extents.width, sent_width, display_width),
        'height': to_sent(extents.height, sent_height, display_height),
    }


nodes = []
truncated = False


def walk(accessible, depth, parent_name):
    global truncated
    if len(nodes) >= MAX_NODES:
        truncated = True
        return
    try:
        states = accessible.getState()
        if not states.contains(STATE_SHOWING):
            return
        role = accessible.getRoleName()
        name = clean(accessible.name)
        value = value_of(accessible, role)
    except Exception:
        # An application can close, or a node disappear, while the tree is being read.
        return
    # Chromium keeps unnamed top-level frames for popups that are not on screen but report
    # themselves as showing. A real window has a title, so an unnamed frame at the top is skipped.
    if depth == 1 and role == 'frame' and not name:
        return
    # A label or static text that repeats its parent's name adds nothing; an unnamed container
    # adds only a level of indentation.
    elided = role in TRANSPARENT and (not name or name == parent_name)
    if not elided:
        node = {'depth': depth, 'role': role, 'name': name}
        if value and value != name:
            node['value'] = value
        box = box_of(accessible)
        if box:
            node.update(box)
        flags = [flag for state, flag in (
            (STATE_FOCUSED, 'focused'), (STATE_CHECKED, 'checked'),
            (STATE_SELECTED, 'selected'), (STATE_PRESSED, 'pressed'),
        ) if states.contains(state)]
        if flags:
            node['states'] = flags
        nodes.append(node)
        depth += 1
        parent_name = name or parent_name
    try:
        count = accessible.childCount
    except Exception:
        return
    for index in range(count):
        try:
            child = accessible.getChildAtIndex(index)
        except Exception:
            continue
        if child is not None:
            walk(child, depth, parent_name)


try:
    # A frozen application must not freeze the caller: each call gives up after a second.
    pyatspi.setTimeout(1000, 5000)
    desktop = pyatspi.Registry.getDesktop(0)
    applications = [desktop.getChildAtIndex(index) for index in range(desktop.childCount)]
except Exception as error:
    fail(f'cannot reach the accessibility bus ({error}); is DBUS_SESSION_BUS_ADDRESS set?')

names, matched = [], 0
for application in applications:
    try:
        name = application.name or ''
    except Exception:
        continue
    names.append(name)
    if wanted and wanted not in name.lower() and ALIASES.get(wanted, wanted) not in name.lower():
        continue
    matched += 1
    nodes.append({'depth': 0, 'role': 'application', 'name': clean(name)})
    for index in range(application.childCount):
        walk(application.getChildAtIndex(index), 1, '')

# A field's visible label is also its accessible name, so the label printed just before it says
# the same thing twice.
nodes = [node for index, node in enumerate(nodes)
         if not (node['role'] in ('static', 'label') and index + 1 < len(nodes)
                 and nodes[index + 1]['depth'] == node['depth']
                 and nodes[index + 1]['name'] == node['name'])]

if as_json:
    print(json.dumps(nodes, ensure_ascii=False))
else:
    for node in nodes:
        line = f"{'  ' * node['depth']}{node['role']} {json.dumps(node['name'], ensure_ascii=False)}"
        if 'value' in node:
            line += f" value={json.dumps(node['value'], ensure_ascii=False)}"
        if 'x' in node:
            line += f" @{node['x']},{node['y']} {node['width']}x{node['height']}"
        if 'states' in node:
            line += ' ' + ' '.join(f'[{state}]' for state in node['states'])
        print(line)
if truncated:
    print(f'desktop: tree truncated at {MAX_NODES} nodes; name an application to narrow it',
          file=sys.stderr)
if not applications:
    print('desktop: no application on the desktop exposes an accessibility tree yet',
          file=sys.stderr)
elif wanted and not matched:
    fail(f"tree: no application matches {wanted!r}; these expose a tree: "
         + ', '.join(repr(name) for name in names if name))
