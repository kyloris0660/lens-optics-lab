"""Build a file://-compatible site and deterministic offline ZIP. Standard library only."""
from pathlib import Path
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
OUT = ROOT / 'docs'
OUT.mkdir(exist_ok=True)


def module(name, exports):
    text = re.sub(r'^export ', '', (SRC / name).read_text(encoding='utf-8'), flags=re.M)
    return '(()=>{\n' + text + '\nreturn {' + exports + '};\n})()'


def bundle(name):
    return re.sub(r'^import .*;\n', '', (SRC / name).read_text(encoding='utf-8'), flags=re.M)


optics = module('optics.mjs', 'analyse,makeSystem,trace,paraxial,index,sag,WAVES')
math = module('guide-math.mjs', 'geometry,diffraction,opticalMTF,airy')
guide = bundle('guide.mjs')
model = json.loads((SRC / 'guide-assets/model.json').read_text(encoding='utf-8'))
guide, count = re.subn(
    r"^fetch\('guide-assets/model.json'\).*;$",
    lambda _: 'model=' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + ';atlas();',
    guide, flags=re.M,
)
assert count == 1, 'Expected precisely one model.json fetch to inline'
scripts = {
    'lab.js': 'const {analyse,makeSystem,trace,paraxial,index,sag,WAVES}=' + optics + ';\n' + bundle('app.mjs'),
    'guide.js': 'const {index}=' + optics + ';\nconst {geometry,diffraction,opticalMTF,airy}=' + math + ';\n' + guide,
}
for name, script in scripts.items():
    (OUT / name).write_text("'use strict';\n(()=>{\n" + script + '\n})();\n', encoding='utf-8')

for src, dst, script in [('index.html', 'lab.html', 'lab.js'), ('guide.html', 'guide.html', 'guide.js')]:
    text = (SRC / src).read_text(encoding='utf-8').replace('href="index.html"', 'href="lab.html"').replace('href="home.html"', 'href="index.html"')
    text, count = re.subn(r'<script type="module" src="[^"]+"></script>', '<script src="' + script + '"></script>', text)
    assert count == 1
    (OUT / dst).write_text(text, encoding='utf-8')

shutil.copy2(SRC / 'home.html', OUT / 'index.html')
for name in ['style.css', 'guide.css', 'validation.md']:
    shutil.copy2(SRC / name, OUT / name)
assets = OUT / 'guide-assets'
assets.mkdir(exist_ok=True)
source_names = {p.name for p in (SRC / 'guide-assets').iterdir() if p.is_file()}
for stale in assets.iterdir():
    if stale.is_file() and stale.name not in source_names:
        stale.unlink()  # Only remove stale files in this generated asset directory.
for name in source_names:
    shutil.copy2(SRC / 'guide-assets' / name, assets / name)
(OUT / '.nojekyll').write_text('', encoding='utf-8')
for name in ['LICENSE', 'THIRD_PARTY.md']:
    shutil.copy2(ROOT / name, OUT / name)
(OUT / '使用说明.txt').write_text(
    '镜头光学图解与交互实验室\n\n完整解压后，用现代桌面浏览器打开 index.html。\n'
    '全部图像、教程和计算均可离线使用，不需要安装或启动服务。\n'
    '外部参考资料与 GitHub 链接需要联网。请保留整个文件夹。\n'
    '离线包中的“下载离线版”链接不会再次附带自身；当前文件夹就是完整离线版。\n'
    '源码与项目说明：https://github.com/kyloris0660/lens-optics-lab\n'
    '代码、原创教学文字与图像采用 MIT 许可；模型限制见网页及 validation.md。\n', encoding='utf-8-sig')

downloads = OUT / 'downloads'
downloads.mkdir(exist_ok=True)
archive = downloads / 'lens-optics-offline.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for path in sorted(OUT.rglob('*')):
        if not path.is_file() or downloads in path.parents:
            continue
        rel = path.relative_to(OUT).as_posix()
        data = path.read_bytes()
        if rel == 'index.html':
            data = data.decode('utf-8').replace(
                '<a class="download" href="downloads/lens-optics-offline.zip" download>下载完全离线版 ↓</a>',
                '<span class="download">当前即为完全离线版 · 可直接使用</span>'
            ).encode('utf-8')
        info = zipfile.ZipInfo('lens-optics-offline/' + rel, (2026, 9, 21, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, data)
print(f'Built {OUT}; offline archive: {archive.stat().st_size:,} bytes')
