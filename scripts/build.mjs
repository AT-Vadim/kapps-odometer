import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const version = JSON.parse(read('package.json')).version;
const boot = `
(function () {
  var render = window.createOdometerRenderer();
  render({meters: 0, car_key: null});
  if (new URLSearchParams(location.search).get('demo') === '1') {
    var meters = 1234500;
    render.setStyle(new URLSearchParams(location.search).get('style') || 'minimal');
    render({meters: meters, car_key: 'demo'});
    setInterval(function () { meters += 3; render({meters: meters, car_key: 'demo'}); }, 100);
    return;
  }
  KappsOdometer.start(render, {version: 1, cars: {}});
})();
`;
const script = [read('src/odometer.js'), read('src/appearance.js'), read('src/renderer.js'), boot].join('\n');
if (script.includes('</script')) throw Error('Unexpected closing script tag in source');
const html = read('src/template.html').replace('</style>', read('src/appearance.css') + '\n</style>').replace('<!-- SCRIPTS -->',
  `<!-- Kapps Odometer ${version} | MIT License | See LICENSE -->\n<script>\n${script}\n</script>`);
fs.mkdirSync(path.join(root, 'Odometer'), {recursive:true});
fs.writeFileSync(path.join(root, 'Odometer/index.html'), html);
console.log(`Built Odometer/index.html (${version}); initial mileage is empty.`);
