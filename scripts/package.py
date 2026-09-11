"""Create a deterministic install ZIP using an explicit list of public files."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
destination = root / 'dist' / f'Odometer-Kapps-v{version}.zip'
destination.parent.mkdir(exist_ok=True)
files = ['Odometer/index.html', 'README.md', 'README.ru.md', 'LICENSE', 'CHANGELOG.md', 'docs/preview.png', 'docs/electronic.png', 'docs/mechanical.png', 'docs/iracing.png']
with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for name in files:
        info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (root / name).read_bytes())
digest = hashlib.sha256(destination.read_bytes()).hexdigest()
destination.with_suffix('.zip.sha256').write_text(f'{digest}  {destination.name}\n')
print(destination)
print(f'SHA256: {digest}')
