function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function box(x, y, w, h, label, seed) {
  const id = uid('rect');
  const textId = uid('text');
  const fontSize = 16;
  const lines = label.split('\n');
  const textHeight = lines.length * (fontSize * 1.25);
  const textY = y + h / 2 - textHeight / 2;

  return [
    {
      angle: 0,
      backgroundColor: '#a5d8ff',
      boundElements: [{ id: textId, type: 'text' }],
      fillStyle: 'solid',
      frameId: null,
      groupIds: [],
      height: h,
      id,
      isDeleted: false,
      link: null,
      locked: false,
      opacity: 100,
      roughness: 1,
      roundness: { type: 3 },
      seed,
      strokeColor: '#1e1e1e',
      strokeStyle: 'solid',
      strokeWidth: 2,
      type: 'rectangle',
      updated: 1,
      version: 1,
      versionNonce: seed + 1,
      width: w,
      x,
      y,
    },
    {
      angle: 0,
      backgroundColor: 'transparent',
      baseline: fontSize,
      boundElements: null,
      containerId: id,
      fillStyle: 'solid',
      frameId: null,
      fontFamily: 1,
      fontSize,
      groupIds: [],
      height: textHeight,
      id: textId,
      isDeleted: false,
      lineHeight: 1.25,
      link: null,
      locked: false,
      opacity: 100,
      originalText: label,
      roughness: 1,
      roundness: null,
      seed: seed + 2,
      strokeColor: '#1e1e1e',
      strokeStyle: 'solid',
      strokeWidth: 1,
      text: label,
      textAlign: 'center',
      type: 'text',
      updated: 1,
      version: 1,
      versionNonce: seed + 3,
      verticalAlign: 'middle',
      width: w - 16,
      x: x + 8,
      y: textY,
    },
  ];
}

function arrow(x1, y1, x2, y2, seed, label) {
  const id = uid('arrow');
  const elements = [
    {
      angle: 0,
      backgroundColor: 'transparent',
      boundElements: label ? [{ id: uid('alabel'), type: 'text' }] : [],
      endArrowhead: 'arrow',
      endBinding: null,
      fillStyle: 'solid',
      frameId: null,
      groupIds: [],
      height: Math.abs(y2 - y1),
      id,
      isDeleted: false,
      lastCommittedPoint: null,
      link: null,
      locked: false,
      opacity: 100,
      points: [
        [0, 0],
        [x2 - x1, y2 - y1],
      ],
      roughness: 1,
      roundness: { type: 2 },
      seed,
      startArrowhead: null,
      startBinding: null,
      strokeColor: '#1e1e1e',
      strokeStyle: 'solid',
      strokeWidth: 2,
      type: 'arrow',
      updated: 1,
      version: 1,
      versionNonce: seed + 1,
      width: Math.abs(x2 - x1),
      x: x1,
      y: y1,
    },
  ];

  if (label) {
    const labelId = uid('alabel');
    elements[0].boundElements = [{ id: labelId, type: 'text' }];
    elements.push({
      angle: 0,
      backgroundColor: 'transparent',
      baseline: 14,
      boundElements: null,
      containerId: null,
      fillStyle: 'solid',
      frameId: null,
      fontFamily: 1,
      fontSize: 14,
      groupIds: [],
      height: 20,
      id: labelId,
      isDeleted: false,
      lineHeight: 1.25,
      link: null,
      locked: false,
      opacity: 100,
      originalText: label,
      roughness: 1,
      roundness: null,
      seed: seed + 2,
      strokeColor: '#1e1e1e',
      strokeStyle: 'solid',
      strokeWidth: 1,
      text: label,
      textAlign: 'center',
      type: 'text',
      updated: 1,
      version: 1,
      versionNonce: seed + 3,
      verticalAlign: 'middle',
      width: 120,
      x: (x1 + x2) / 2 - 60,
      y: (y1 + y2) / 2 - 24,
    });
  }

  return elements;
}

function excalidrawDocument(elements) {
  return {
    appState: {
      exportBackground: true,
      exportWithDarkMode: false,
      gridSize: null,
      viewBackgroundColor: '#ffffff',
    },
    elements,
    files: {},
    source: 'https://excalidraw.com',
    type: 'excalidraw',
    version: 2,
  };
}

function buildArchitectureDiagram() {
  const elements = [];
  let seed = 1000;

  const push = (parts) => {
    elements.push(...parts);
    seed += 10;
  };

  push(box(40, 80, 140, 70, 'Web / iOS\nClient', seed));
  push(box(40, 200, 140, 70, 'CloudFront\n+ S3 Frontend', seed));
  push(box(240, 140, 160, 90, 'API Gateway\nCUSTOM authorizer\nx-api-key', seed));
  push(box(460, 60, 150, 60, 'lambda_workflow\nPOST /workflow', seed));
  push(box(460, 150, 150, 60, 'lambda_get_results\nGET /results', seed));
  push(box(460, 240, 150, 60, 'lambda_get_markdown\nGET /markdown', seed));
  push(box(660, 120, 170, 80, 'Step Functions\nSPRINT_ANALYSIS', seed));
  push(box(880, 40, 200, 280, 'Workflow Lambdas\nparse_repos\nfetch_repo_data\nprepare_data\nfetch_pr_details\nanalyze_pr\naggregate_sprint\nstore_results', seed));
  push(box(880, 360, 200, 70, 'S3 Results Bucket\nSSE-S3, versioned', seed));
  push(box(660, 280, 170, 60, 'AWS Bedrock\nClaude 3.5', seed));
  push(box(660, 380, 170, 60, 'GitHub API', seed));

  push(arrow(180, 115, 240, 175, seed, 'HTTPS'));
  push(arrow(110, 200, 110, 150, seed));
  push(arrow(400, 185, 460, 90, seed, 'auth'));
  push(arrow(400, 185, 460, 180, seed));
  push(arrow(400, 185, 460, 270, seed));
  push(arrow(610, 90, 660, 160, seed, 'start'));
  push(arrow(830, 160, 880, 160, seed, 'tasks'));
  push(arrow(980, 320, 980, 360, seed, 'store'));
  push(arrow(830, 310, 880, 200, seed, 'invoke'));
  push(arrow(830, 410, 880, 250, seed, 'fetch'));

  return excalidrawDocument(elements);
}

function buildWorkflowDiagram() {
  const elements = [];
  let seed = 2000;
  const push = (parts) => {
    elements.push(...parts);
    seed += 10;
  };

  const col = 80;
  const w = 520;
  const h = 48;
  const gap = 56;
  const steps = [
    'Client POST /workflow (x-api-key)',
    'API Gateway → lambda_workflow → Step Functions',
    'Client polls GET /results?executionArn=…',
    'Step Functions: GitHub PRs, diffs, reviews',
    'Bedrock: analyze PRs + aggregate sprint report',
    'store_results → S3 markdown',
    'Client GET /markdown?key=… → report',
    'Alt: NoValidAnalyses → inline warning (terminal)',
  ];

  steps.forEach((label, i) => {
    push(box(col, 40 + i * gap, w, h, label, seed + i));
    if (i > 0) {
      push(arrow(col + w / 2, 40 + (i - 1) * gap + h, col + w / 2, 40 + i * gap, seed + i + 100));
    }
  });

  return excalidrawDocument(elements);
}

module.exports = {
  buildArchitectureDiagram,
  buildWorkflowDiagram,
  excalidrawDocument,
};
