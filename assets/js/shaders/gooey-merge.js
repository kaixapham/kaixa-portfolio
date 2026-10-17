// Figma shader: Gooey merge — lib/custom-effects/CodeComponentId_21735e902a05a5a6705d9b6bed9b4f68c5073d58_408.ts
// Chép NGUYÊN VĂN từ shader của Figma (get_design_context), chỉ bỏ 3 chú thích kiểu TypeScript.

// Property metadata is only used in Figma Design, so this is a no-op.
function defineProperties(
  _component,
  _properties,
) {}

export default function Effect() { }
export function setup(device, frame) {
    // ── Shared uniforms struct (all shaders use this layout) ──────────────────
    var uniformsDecl = `
struct Uniforms {
  frameData: vec4f,
  inputDimsAndPad: vec4f,
  spread: vec4f,
  threshold: vec4f,
  edgeSoftness: vec4f,
  foregroundColor: vec4f,
  backgroundColor: vec4f,
  mode: vec4f,
  invert: vec4f,
  preserveInput: vec4f,
};
`;
    // Shared vertex shader used by all passes
    var vsDecl = `
struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};
@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}
`;
    // ── H-Gaussian pass (writes to halfTex) ───────────────────────────────────
    var hGaussWgsl = `diagnostic(off,derivative_uniformity);
` + uniformsDecl + `
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var inputTex: texture_2d<f32>;
` + vsDecl + `
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let dims = max(u.frameData.yz, vec2f(1.0));
  let inputDims = max(u.inputDimsAndPad.xy, vec2f(1.0));
  let inputPad = u.inputDimsAndPad.z;
  let outputPad = u.frameData.w;
  // Sample at 2x stride to effectively work at half resolution
  let texel = vec2f(2.0) / inputDims;
  let fragPx = uv * dims;
  let contentOriginPx = vec2f(inputPad + outputPad);
  let contentUv = (fragPx - contentOriginPx) / inputDims;

  let spread = u.spread.x;
  let spreadR = i32(spread);
  let sigma = max(spread / 3.0, 0.001);
  var accR = 0.0;
  var accG = 0.0;
  var accB = 0.0;
  var accA = 0.0;
  var totalWeight = 0.0;
  for (var dx = -spreadR; dx <= spreadR; dx++) {
    let sampleUv = clamp(contentUv + vec2f(f32(dx) * texel.x, 0.0), vec2f(0.0), vec2f(1.0));
    let texCoord = (vec2f(inputPad + outputPad) + sampleUv * inputDims) / (inputDims + vec2f(2.0 * (inputPad + outputPad)));
    let s = textureSampleLevel(inputTex, samp, texCoord, 0.0);
    let dist = f32(dx);
    let w = exp(-0.5 * (dist / sigma) * (dist / sigma));
    accR += s.r * w;
    accG += s.g * w;
    accB += s.b * w;
    accA += s.a * w;
    totalWeight += w;
  }
  let invW = select(0.0, 1.0 / totalWeight, totalWeight > 0.0);
  return vec4f(accR * invW, accG * invW, accB * invW, accA * invW);
}
`;
    // ── V-Gaussian pass (reads halfTex, writes blurTex at full res) ───────────
    var vGaussWgsl = `diagnostic(off,derivative_uniformity);
` + uniformsDecl + `
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var halfTex: texture_2d<f32>;
` + vsDecl + `
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let dims = max(u.frameData.yz, vec2f(1.0));
  // halfTex is half dims, bilinear sampler upsamples
  let halfDims = max(floor(dims / 2.0), vec2f(1.0));
  let texel = vec2f(1.0) / halfDims;

  let spread = u.spread.x;
  let spreadR = i32(spread);
  let sigma = max(spread / 3.0, 0.001);
  var accR = 0.0;
  var accG = 0.0;
  var accB = 0.0;
  var accA = 0.0;
  var totalWeight = 0.0;
  for (var dy = -spreadR; dy <= spreadR; dy++) {
    let sampleUv = clamp(uv + vec2f(0.0, f32(dy) * texel.y), vec2f(0.0), vec2f(1.0));
    let s = textureSampleLevel(halfTex, samp, sampleUv, 0.0);
    let dist = f32(dy);
    let w = exp(-0.5 * (dist / sigma) * (dist / sigma));
    accR += s.r * w;
    accG += s.g * w;
    accB += s.b * w;
    accA += s.a * w;
    totalWeight += w;
  }
  let invW = select(0.0, 1.0 / totalWeight, totalWeight > 0.0);
  return vec4f(accR * invW, accG * invW, accB * invW, accA * invW);
}
`;
    // ── Threshold/colorize pass (reads blurTex field, writes to output) ───────
    var tWgsl = `diagnostic(off,derivative_uniformity);
` + uniformsDecl + `
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var fieldTex: texture_2d<f32>;
` + vsDecl + `
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let s = textureSampleLevel(fieldTex, samp, uv, 0.0);
  let lumaStd = dot(s.rgb, vec3f(0.2126, 0.7152, 0.0722)) * s.a;
  let normalizedField = select(lumaStd, s.a, u.mode.x > 0.5);

  let norm = clamp(u.threshold.x / 100.0, -1.0, 1.0);
  var threshold: f32;
  if (norm >= 0.0) {
    threshold = (1.0 - norm) * (1.0 - norm) * 0.5;
  } else {
    threshold = 0.5 - norm - norm * norm * 0.5;
  }
  let edgeSoftness = u.edgeSoftness.x / max(u.spread.x, 1.0);
  let foregroundColor = u.foregroundColor;
  let backgroundColor = u.backgroundColor;
  let lo = threshold - edgeSoftness;
  let hi = threshold + edgeSoftness;
  let t = smoothstep(lo, hi, normalizedField);
  let tFinal = select(t, 1.0 - t, u.invert.x > 0.5);
  let fgPremul = vec4f(foregroundColor.rgb * foregroundColor.a, foregroundColor.a);
  let bgPremul = vec4f(backgroundColor.rgb * backgroundColor.a, backgroundColor.a);
  let baseMix = mix(bgPremul, fgPremul, tFinal);
  let blurredInput = s;
  let withInput = mix(bgPremul, blurredInput, tFinal);
  let preserveInput = u.preserveInput.x;
  return mix(baseMix, withInput, preserveInput);
}
`;
    // ── Create shader modules ──────────────────────────────────────────────────
    frame.state.hGaussModule = device.createShaderModule({ code: hGaussWgsl });
    frame.state.vGaussModule = device.createShaderModule({ code: vGaussWgsl });
    frame.state.tModule = device.createShaderModule({ code: tWgsl });
    // Pipeline cache (keyed by format)
    frame.state.hGaussPipeline = null;
    frame.state.vGaussPipeline = null;
    frame.state.tPipeline = null;
    frame.state.tPipelineFormat = null;
    // Quad vertex buffer
    frame.state.quad = device.createBuffer({
        size: 6 * 4 * 4,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(frame.state.quad.getMappedRange()).set([
        -1, -1, 0, 1,
        1, -1, 1, 1,
        -1, 1, 0, 0,
        -1, 1, 0, 0,
        1, -1, 1, 1,
        1, 1, 1, 0,
    ]);
    frame.state.quad.unmap();
    // Uniform buffer: 10 vec4f = 160 bytes
    frame.state.uniformBuf = device.createBuffer({
        size: 160,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    frame.state.sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
    });
    // Intermediate textures — recreated when dims change
    frame.state.blurTex = device.createTexture({
        size: [1, 1, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    frame.state.halfTex = device.createTexture({
        size: [1, 1, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    frame.state.blurTexWidth = 1;
    frame.state.blurTexHeight = 1;
    frame.state.placeholder = device.createTexture({
        size: [1, 1, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture({ texture: frame.state.placeholder }, new Uint8Array([0, 0, 0, 0]), { bytesPerRow: 4 }, { width: 1, height: 1, depthOrArrayLayers: 1 });
}
export function render(device, frame) {
    var params = frame.params || {};
    function finiteNumber(value, fallback) {
        var num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }
    function numberParam(name, fallback) {
        return finiteNumber(params[name], fallback);
    }
    function colorParam(name, fallback) {
        var value = params[name] || {};
        return [
            finiteNumber(value.r, fallback[0]),
            finiteNumber(value.g, fallback[1]),
            finiteNumber(value.b, fallback[2]),
            finiteNumber(value.a, fallback[3]),
        ];
    }
    var modeVal = numberParam("mode", 0) > 0.5 ? 1.0 : 0.0;
    var invertVal = params["invert"] ? 1.0 : 0.0;
    var spread = numberParam("spread", 20) + 4;
    var output = frame.output || {};
    var width = Math.max(1, finiteNumber(output.width, 1));
    var height = Math.max(1, finiteNumber(output.height, 1));
    var time = 0;
    var outputPad = finiteNumber(frame.outputPadding, 0);
    var inputPad = finiteNumber(frame.inputPadding, 0);
    var inputWidth = Math.max(1, width - 2 * outputPad);
    var inputHeight = Math.max(1, height - 2 * outputPad);
    // Build main uniform data (mode hard-coded to 0 = luma)
    var uniformData = new Float32Array([
        time, width, height, outputPad,
        inputWidth, inputHeight, inputPad, 0,
        spread, 0, 0, 0,
        numberParam("threshold", 0), 0, 0, 0,
        numberParam("edgeSoftness", 0.5), 0, 0, 0,
        ...colorParam("foregroundColor", [0, 0, 0, 1]),
        ...colorParam("backgroundColor", [1, 1, 1, 0]),
        modeVal, 0, 0, 0,
        invertVal, 0, 0, 0,
        numberParam("preserveInput", 0) / 100.0, 0, 0, 0,
    ]);
    device.queue.writeBuffer(frame.state.uniformBuf, 0, uniformData);
    // ── Recreate intermediate textures when dims change ───────────────────────
    if (frame.state.blurTexWidth !== width || frame.state.blurTexHeight !== height) {
        frame.state.blurTex = device.createTexture({
            size: [width, height, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        var halfW = Math.max(1, Math.floor(width / 2));
        var halfH = Math.max(1, Math.floor(height / 2));
        frame.state.halfTex = device.createTexture({
            size: [halfW, halfH, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        frame.state.blurTexWidth = width;
        frame.state.blurTexHeight = height;
        // Invalidate all pipelines (format may have changed)
        frame.state.tPipelineFormat = null;
    }
    var outputFormat = frame.output.format;
    var inputView = frame.input != null
        ? frame.input.createView()
        : frame.state.placeholder.createView();
    // ── Helper: build a render pipeline ───────────────────────────────────────
    function makePipeline(module, targetFormat) {
        return device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: module,
                entryPoint: 'vs_main',
                buffers: [{
                        arrayStride: 16,
                        attributes: [
                            { shaderLocation: 0, format: 'float32x2', offset: 0 },
                            { shaderLocation: 1, format: 'float32x2', offset: 8 },
                        ],
                    }],
            },
            fragment: {
                module: module,
                entryPoint: 'fs_main',
                targets: [{ format: targetFormat }],
            },
            primitive: { topology: 'triangle-list' },
        });
    }
    // ── Lazily build threshold pipeline (uses output format) ──────────────────
    if (frame.state.tPipelineFormat !== outputFormat) {
        frame.state.tPipeline = makePipeline(frame.state.tModule, outputFormat);
        frame.state.tPipelineFormat = outputFormat;
    }
    // ── Helper: run one render pass ───────────────────────────────────────────
    function runPass(encoder, pipeline, uniformBuffer, texView, targetView, clearAlpha) {
        var bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: frame.state.sampler },
                { binding: 2, resource: texView },
            ],
        });
        var pass = encoder.beginRenderPass({
            colorAttachments: [{
                    view: targetView,
                    loadOp: 'clear',
                    clearValue: { r: 0, g: 0, b: 0, a: clearAlpha },
                    storeOp: 'store',
                }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setVertexBuffer(0, frame.state.quad);
        pass.draw(6);
        pass.end();
    }
    function runThresholdPass(encoder, fieldTexView) {
        runPass(encoder, frame.state.tPipeline, frame.state.uniformBuf, fieldTexView, frame.output.createView(), 0);
    }
    // ── Lazy pipeline getters ─────────────────────────────────────────────────
    function getHGaussPipeline() {
        if (!frame.state.hGaussPipeline) {
            frame.state.hGaussPipeline = makePipeline(frame.state.hGaussModule, 'rgba8unorm');
        }
        return frame.state.hGaussPipeline;
    }
    function getVGaussPipeline() {
        if (!frame.state.vGaussPipeline) {
            frame.state.vGaussPipeline = makePipeline(frame.state.vGaussModule, 'rgba8unorm');
        }
        return frame.state.vGaussPipeline;
    }
    var encoder = device.createCommandEncoder();
    // H-Gauss at full res → halfTex, V-Gauss reads halfTex → blurTex, T → output
    runPass(encoder, getHGaussPipeline(), frame.state.uniformBuf, inputView, frame.state.halfTex.createView(), 1);
    runPass(encoder, getVGaussPipeline(), frame.state.uniformBuf, frame.state.halfTex.createView(), frame.state.blurTex.createView(), 1);
    runThresholdPass(encoder, frame.state.blurTex.createView());
    device.queue.submit([encoder.finish()]);
}
defineProperties(Effect, {
    "mode": {
        type: "number",
        label: "Input mode",
        defaultValue: 0,
        control: "select",
        options: [
            { value: 0, label: "Luma" },
            { value: 1, label: "Alpha" },
        ],
    },
    "spread": {
        type: "number",
        label: "Spread",
        defaultValue: 20,
        control: "slider",
        min: 0,
        max: 50,
        step: 1,
    },
    "threshold": {
        type: "number",
        label: "Threshold",
        unit: "%",
        defaultValue: 0,
        control: "slider",
        min: -50,
        max: 50,
        step: 1,
    },
    "edgeSoftness": {
        type: "number",
        label: "Edge softness",
        unit: "px",
        defaultValue: 0.5,
        control: "slider",
        min: 0,
        max: 10,
        step: 0.1,
    },
    "foregroundColor": {
        type: "color",
        label: "Foreground",
        defaultValue: { "r": 1, "g": 1, "b": 1, "a": 1 },
    },
    "backgroundColor": {
        type: "color",
        label: "Background",
        defaultValue: { "r": 0, "g": 0, "b": 0, "a": 1 },
    },
    "preserveInput": {
        type: "number",
        label: "Source mix",
        unit: "%",
        defaultValue: 0,
        control: "slider",
        min: 0,
        max: 100,
        step: 1,
    },
    "invert": {
        type: "boolean",
        label: "Invert",
        defaultValue: false,
    },
});

export const manifest = {
  "name": "Gooey merge",
  "version": 2,
  "isAnimated": false,
  "usesMouse": false
}
