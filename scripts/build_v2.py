"""Build standalone second-proposal lessons from existing approved mock media."""
from pathlib import Path
import base64,json,mimetypes,subprocess,shutil
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'mock'
node=shutil.which('node') or str(Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
data=json.loads(subprocess.check_output([node,'-e','global.window={};'+(SOURCE/'lessons.js').read_text()+';process.stdout.write(JSON.stringify(window.MPI_LESSONS));'],text=True))
# Extra model-voice playback is intentionally absent from the second proposal.
for lesson in data.values():
 for prompt in lesson['prompts']:
  for field in ['audio', 'questionAudio', 'spoken']:
   prompt.pop(field, None)
def pack(value):
 if isinstance(value,dict):return {k:pack(v) for k,v in value.items()}
 if isinstance(value,list):return [pack(v) for v in value]
 if isinstance(value,str) and value.startswith('assets/'):
  p=SOURCE/value;return 'data:'+(mimetypes.guess_type(p.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(p.read_bytes()).decode()
 return value
shared=(SOURCE/'app.js').read_text();helpers=shared[shared.index('  const icons ='):shared.index('  const query =')]
helpers=helpers.replace('おてほんを見て、聞いて、話す','動画を見て、聞いて、話す')
app=(ROOT/'mock-v2/app.js').read_text().replace('/* GRAPHIC_HELPERS */',helpers).replace('assets/brand/mpi-logo.png',pack('assets/brand/mpi-logo.png'))
css=(ROOT/'mock-v2/styles.css').read_text()
for key,lesson in data.items():
 html='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light"><title>'+lesson['name']+' | mpi英語プログラム</title><style>'+css+'</style></head><body data-lesson="'+key+'"><div id="app"></div><noscript>JavaScriptを有効にしてください。</noscript><script>window.MPI_LESSONS='+json.dumps({key:pack(lesson)},ensure_ascii=False).replace('<','\\u003c')+';</script><script>'+app+'</script></body></html>'
 dest=ROOT/'public'/f'{key}-v2.html';dest.write_text(html);print(dest.name,dest.stat().st_size,flush=True)
