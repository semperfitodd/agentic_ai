const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { renderExcalidrawToSvg } = require('./render-excalidraw.cjs');
const {
  buildArchitectureDiagram,
  buildWorkflowDiagram,
} = require('./diagram-helpers.cjs');

const root = path.join(__dirname, '..');
const diagramsDir = path.join(root, 'diagrams');
const exportsDir = path.join(root, 'exports');

const builders = {
  architecture: buildArchitectureDiagram,
  workflow: buildWorkflowDiagram,
};

function syncSources() {
  fs.mkdirSync(diagramsDir, { recursive: true });
  for (const [name, build] of Object.entries(builders)) {
    const scene = build();
    fs.writeFileSync(
      path.join(diagramsDir, `${name}.excalidraw`),
      `${JSON.stringify(scene, null, 2)}\n`,
    );
  }
}

function exportDiagram(sourcePath) {
  const name = path.basename(sourcePath, '.excalidraw');
  const scene = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const svgString = renderExcalidrawToSvg(scene);

  fs.mkdirSync(exportsDir, { recursive: true });
  fs.writeFileSync(path.join(exportsDir, `${name}.svg`), svgString);

  const resvg = new Resvg(svgString, {
    background: scene.appState?.viewBackgroundColor || '#ffffff',
    fitTo: { mode: 'original' },
  });
  const pngData = resvg.render();
  fs.writeFileSync(path.join(exportsDir, `${name}.png`), pngData.asPng());

  console.log(`Exported ${name}.svg and ${name}.png`);
}

function main() {
  if (process.argv.includes('--sync-sources')) {
    syncSources();
  }

  if (!fs.existsSync(diagramsDir)) {
    syncSources();
  }

  const sources = fs
    .readdirSync(diagramsDir)
    .filter((file) => file.endsWith('.excalidraw'))
    .map((file) => path.join(diagramsDir, file));

  if (sources.length === 0) {
    syncSources();
    return main();
  }

  for (const sourcePath of sources) {
    exportDiagram(sourcePath);
  }
}

main();
