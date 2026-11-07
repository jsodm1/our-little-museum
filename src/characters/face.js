const SIZE = { width: 384, height: 512 };
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
let detectorPromise;

function canvas(width, height) {
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  return output;
}

async function detector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const base = import.meta.env.BASE_URL;
      const vision = await FilesetResolver.forVisionTasks(`${base}mediapipe`);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `${base}models/face_landmarker.task`, delegate: 'CPU' },
        runningMode: 'IMAGE',
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })();
  }
  return detectorPromise;
}

function sampleSkin(context, points) {
  const samples = [];
  for (const { x, y } of points) {
    const px = clamp(Math.round(x), 2, context.canvas.width - 3);
    const py = clamp(Math.round(y), 2, context.canvas.height - 3);
    const pixels = context.getImageData(px - 2, py - 2, 5, 5).data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 200) samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
  }
  if (!samples.length) return '#c98f72';
  const rgb = [0, 1, 2].map((channel) => {
    const sorted = samples.map((sample) => sample[channel]).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  });
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function faceMask(output) {
  const mask = canvas(output.width, output.height);
  const context = mask.getContext('2d');
  context.scale(output.width, output.height);
  context.beginPath();
  context.moveTo(0.5, 0.012);
  context.bezierCurveTo(0.21, 0.012, 0.052, 0.16, 0.038, 0.43);
  context.bezierCurveTo(0.035, 0.66, 0.14, 0.85, 0.35, 0.967);
  context.quadraticCurveTo(0.5, 1.015, 0.65, 0.967);
  context.bezierCurveTo(0.86, 0.85, 0.965, 0.66, 0.962, 0.43);
  context.bezierCurveTo(0.948, 0.16, 0.79, 0.012, 0.5, 0.012);
  context.closePath();
  context.fill();
  const target = output.getContext('2d');
  target.save();
  target.globalCompositeOperation = 'destination-in';
  target.filter = 'blur(3px)';
  target.drawImage(mask, 0, 0);
  target.restore();
}

function landmarkCrop(input, points) {
  const width = input.width, height = input.height;
  const point = (index) => ({ x: points[index].x * width, y: points[index].y * height });
  const eyeA = point(33), eyeB = point(263);
  const left = eyeA.x < eyeB.x ? eyeA : eyeB;
  const right = eyeA.x < eyeB.x ? eyeB : eyeA;
  const center = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  const angle = Math.atan2(right.y - left.y, right.x - left.x);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const unroll = (p) => ({
    x: (p.x - center.x) * cos + (p.y - center.y) * sin,
    y: -(p.x - center.x) * sin + (p.y - center.y) * cos,
  });
  const forehead = unroll(point(10));
  const chin = unroll(point(152));
  const mouth = unroll(point(13));
  const cheekA = unroll(point(234)), cheekB = unroll(point(454));
  const faceSpan = Math.abs(cheekB.x - cheekA.x);
  const faceLength = chin.y - forehead.y;
  if (faceSpan < 20 || faceLength < 30 || mouth.y < 4 || chin.y <= mouth.y) {
    throw new Error('A clear front-facing face is needed.');
  }
  const output = canvas(SIZE.width, SIZE.height);
  const context = output.getContext('2d');
  // Roll is removed around the eyes. Four vertical bands place the forehead,
  // eyes, mouth and chin on matching regions of the curved avatar surface.
  const bands = [
    [forehead.y - faceLength * 0.035, 0.018],
    [0, 0.53],
    [mouth.y, 0.79],
    [chin.y + faceLength * 0.012, 0.99],
  ];
  const sx = output.width * 0.91 / faceSpan;
  for (let index = 0; index < bands.length - 1; index++) {
    const [sourceTop, targetTop] = bands[index];
    const [sourceBottom, targetBottom] = bands[index + 1];
    const sy = output.height * (targetBottom - targetTop) / (sourceBottom - sourceTop);
    context.save();
    context.beginPath();
    context.rect(0, targetTop * output.height, output.width,
      (targetBottom - targetTop) * output.height + 1);
    context.clip();
    context.translate(output.width / 2, targetTop * output.height - sourceTop * sy);
    context.scale(sx, sy);
    context.rotate(-angle);
    context.translate(-center.x, -center.y);
    context.drawImage(input, 0, 0);
    context.restore();
  }
  faceMask(output);
  return {
    faceTexture: output.toDataURL('image/png'),
    faceWidth: clamp(faceSpan / faceLength / 0.75, 0.8, 1.2),
    faceHeight: clamp(faceLength / faceSpan * 0.75, 0.85, 1.15),
    skin: sampleSkin(input.getContext('2d'), [point(50), point(280), point(101), point(330)]),
    source: 'landmarks',
  };
}

function manualCrop(input) {
  const output = canvas(SIZE.width, SIZE.height);
  const context = output.getContext('2d');
  const sourceHeight = Math.min(input.height * 0.85, input.width / 0.75);
  const sourceWidth = sourceHeight * 0.75;
  const x = (input.width - sourceWidth) / 2;
  const y = Math.max(0, (input.height - sourceHeight) * 0.35);
  context.drawImage(input, x, y, sourceWidth, sourceHeight, 0, 0, output.width, output.height);
  const skin = sampleSkin(context, [
    { x: output.width * 0.32, y: output.height * 0.65 },
    { x: output.width * 0.68, y: output.height * 0.65 },
  ]);
  faceMask(output);
  return { faceTexture: output.toDataURL('image/png'), faceWidth: 1, faceHeight: 1, skin, source: 'manual' };
}

/** Processes one photo on this device. The returned texture maps to a stylized
 * curved head. The manual result is a central crop, not a landmark fit. */
export async function prepareFace(file) {
  if (!(file instanceof Blob) || !file.type.startsWith('image/')) {
    throw new Error('Choose a JPG, PNG or WebP portrait.');
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a portrait smaller than 20 MB.');
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('This portrait could not be read.');
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const input = canvas(Math.max(8, Math.round(image.naturalWidth * scale)),
      Math.max(8, Math.round(image.naturalHeight * scale)));
    input.getContext('2d').drawImage(image, 0, 0, input.width, input.height);
    try {
      const faceDetector = await detector();
      const result = faceDetector.detect(input);
      if (result.faceLandmarks?.[0]?.length >= 455) return landmarkCrop(input, result.faceLandmarks[0]);
    } catch {
      // Local WASM/model loading or recognition can fail on older browsers.
      // The caller receives a distinct source flag for its fallback guidance.
    }
    return manualCrop(input);
  } finally {
    URL.revokeObjectURL(url);
  }
}
