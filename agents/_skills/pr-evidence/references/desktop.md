# Desktop recordings

A desktop recording shows the whole screen first, so the reviewer knows where they are, then zooms in and follows the
pointer while it works. [desktop-record](../scripts/desktop-record) records the display and the pointer, and renders
the zoom afterwards. Drive the desktop with the `computer-use` skill's `desktop` helper in between.

## Prepare the browser

Open Chromium on the desktop with a profile that turns off Chrome's translation offer and spellchecker. Chrome offers to
translate Norwegian pages in a bar that covers the page, and underlines words like "kr" in inputs. From the artifact
directory:

```sh
mkdir -p profile/Default
echo '{"translate":{"enabled":false},"browser":{"enable_spellchecking":false}}' > profile/Default/Preferences
echo "{\"browser\":{\"userDataDir\":\"$PWD/profile\"}}" > browser.json
export PLAYWRIGHT_CLI_SESSION=<task>
playwright-cli open --browser chromium --headed --config=browser.json <start-url>
```

Go through the flow once before recording. The first load of a dev server or an app is slow, and later loads are not.
Then go back to the starting page, and take a screenshot to measure where the controls are. `desktop` and
`desktop-record glide` take coordinates in the screenshot's pixels.

## Record

Write the scenario as a script, so that before and after run the same steps. A scenario looks like this:

```sh
R="python3 <skill-dir>/scripts/desktop-record"
D=$PWD
wait_for() { playwright-cli run-code "async page => page.$1.waitFor({ timeout: 60000 })" >/dev/null; }

$R start "$D"
sleep 2                                          # the whole screen, to orient the reviewer
$R glide 812 553; desktop click 812 553
wait_for "getByRole('textbox', { name: 'Amount' })"; sleep 1
$R zoom "$D" 1.8                                 # zoom in while the pointer moves to the form
$R glide 500 453; desktop click 500 453
for c in 1 0 , 4 8; do desktop type "$c"; sleep 0.15; done
sleep 2
$R zoom "$D" 2.3; $R glide 700 597 1             # closer on the result, pointer beside it
sleep 5
$R stop "$D"
$R render "$D" "$D/result.mp4"
```

- `glide` moves the pointer smoothly, where `desktop move` jumps. The camera keeps still while the pointer stays near the
  middle of the view, and pans when it leaves.
- `zoom` sets the level from that moment, and the camera eases to it. Zoom in after the page is ready, not during a load.
- Wait for the element the next step needs, with `playwright-cli`, rather than sleeping a fixed time.
- Type a character at a time, so that the reviewer can read along.
- Leave the pointer beside the result, not on it. Browsers show tooltips for some inputs, and they cover the value.

Check `media-preview result.mp4` and a few frames at full size before attaching. The rendered MP4 is about 25 KB a
second at 1280 pixels wide.
