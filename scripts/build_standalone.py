"""Build two independent HTML lessons; embed code and original media, no network required."""
from pathlib import Path
import base64
import json
import mimetypes
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'mock'
OUT = ROOT / 'public'
OUT.mkdir(exist_ok=True)
# lessons.js contains only a literal dataset assigned to window.MPI_LESSONS.
js = (SOURCE / 'lessons.js').read_text()
# Use the available Node executable to export the existing JavaScript data as JSON.
import shutil
node = shutil.which('node')
if node is None:
    bundled = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
    node = str(bundled) if bundled.exists() else None
if node is None:
    raise SystemExit('Node.js is required to rebuild the standalone HTML files.')
code = 'global.window={};' + js + ';process.stdout.write(JSON.stringify(window.MPI_LESSONS));'
lessons = json.loads(subprocess.check_output([node, '-e', code], text=True))

def inline_assets(value):
    if isinstance(value, dict):
        return {k: inline_assets(v) for k, v in value.items()}
    if isinstance(value, list):
        return [inline_assets(v) for v in value]
    if isinstance(value, str) and value.startswith('assets/'):
        file = SOURCE / value
        mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        return 'data:' + mime + ';base64,' + base64.b64encode(file.read_bytes()).decode('ascii')
    return value

css = (SOURCE / 'tokens.css').read_text() + '\n' + (SOURCE / 'styles.css').read_text().replace("@import url('tokens.css');", '')
logo = 'data:image/png;base64,' + base64.b64encode((SOURCE / 'assets/brand/mpi-logo.png').read_bytes()).decode('ascii')
app = (SOURCE / 'app.js').read_text().replace('assets/brand/mpi-logo.png', logo)
for key, data in lessons.items():
    html = (SOURCE / f'{key}.html').read_text()
    html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
    payload = json.dumps({key: inline_assets(data)}, ensure_ascii=False).replace('<', '\\u003c')
    # Scripts at the end of body run after the application container exists.
    html = html.replace('<script src="lessons.js" defer></script>', '').replace('<script src="app.js" defer></script>', '')
    html = html.replace('</body>', '<script>window.MPI_LESSONS=' + payload + ';</script>\n<script>\n' + app + '\n</script>\n</body>')
    (OUT / f'{key}.html').write_text(html)
    print(f'{key}.html: {len(html.encode()):,} bytes')
hub = (SOURCE / 'index.html').read_text().replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
(OUT / 'index.html').write_text(hub.replace('assets/brand/mpi-logo.png', logo))
(OUT / '.nojekyll').write_text('')
