"""Check local links, offline runtime dependencies and packaged assets."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import io
import re
import zipfile

ROOT = Path(__file__).resolve().parent
SITE = ROOT / 'docs'


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.refs = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, 'Duplicate HTML id: ' + attrs['id']
            self.ids.add(attrs['id'])
        assert not (tag == 'script' and attrs.get('type') == 'module'), 'Unbundled module'
        for key in ['href', 'src']:
            if key in attrs:
                self.refs.append((tag, key, attrs[key]))


def verify(files):
    pages = {name: Page(data.decode('utf-8')) for name, data in files.items() if name.endswith('.html')}
    for name, page in pages.items():
        for tag, key, ref in page.refs:
            url = urlsplit(ref)
            if url.scheme in ['http', 'https']:
                assert tag == 'a' and key == 'href', 'Automatic remote load: ' + ref
                continue
            if url.scheme == 'data':
                continue
            target = unquote(url.path) or name
            assert target in files, f'{name}: missing {target}'
            if url.fragment and target in pages:
                assert unquote(url.fragment) in pages[target].ids, f'{name}: missing anchor {ref}'
    for name, data in files.items():
        if name.endswith(('.js', '.css')):
            text = data.decode('utf-8')
            assert not re.search(r'\b(fetch\s*\(|XMLHttpRequest|WebSocket|import\s*\(|import\s+|@import\b|serviceWorker)', text), name
            for url in re.findall(r'url\([\x22\x27]?([^\)\x22\x27]+)', text):
                assert url.startswith(('#', 'data:')) or url in files, name + ': ' + url
    for forbidden in ['canon-flare.jpg', 'canon-suppressed.jpg', 'hosting.json']:
        assert all(not name.endswith(forbidden) for name in files), forbidden
    return len(pages)


files = {p.relative_to(SITE).as_posix(): p.read_bytes() for p in SITE.rglob('*') if p.is_file()}
assert len(files) > 60, 'Incomplete website'
pages = verify(files)
with zipfile.ZipFile(io.BytesIO(files['downloads/lens-optics-offline.zip'])) as z:
    assert z.testzip() is None
    offline = {name.split('/', 1)[1]: z.read(name) for name in z.namelist()}
    assert verify(offline) == pages
    for name, data in offline.items():
        if name != 'index.html':
            assert data == files[name], 'Offline file differs: ' + name
assert (ROOT / 'LICENSE').read_bytes() == files['LICENSE']
print(f'PASS: {pages} pages, local links/anchors, no automatic network loads, offline ZIP CRC/content and license.')
