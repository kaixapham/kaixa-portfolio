// Figma shader: Color adjust — lib/custom-effects/CodeComponentId_dd018d6f50bd3341bd526cc999faf775abd74611_413.ts
// Chép NGUYÊN VĂN từ shader của Figma (get_design_context), chỉ bỏ 3 chú thích kiểu TypeScript.

// Property metadata is only used in Figma Design, so this is a no-op.
function defineProperties(
  _component,
  _properties,
) {}

export default function Effect() { }
export function setup(device, frame) {
    var wgsl = `
diagnostic(off,derivative_uniformity);
struct Uniforms {
  frameData: vec4f,
  inputDimsAndPad: vec4f,
  exposure: vec4f,
  contrast: vec4f,
  blackPoint: vec4f,
  whitePoint: vec4f,
  highlights: vec4f,
  shadows: vec4f,
  gamma: vec4f,
  temperature: vec4f,
  tint: vec4f,
  colorFilter: vec4f,
  vibrance: vec4f,
  saturation: vec4f,
  brilliance: vec4f,
  definition: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var inputTex: texture_2d<f32>;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

fn sampleInput(p: vec2f) -> vec4f {
  // p is input-relative (0..1 over the content rect). The bound input texture
  // is the upstream padded output, with the content inset by inputPad on every
  // side, so map content UV -> texture UV before sampling. For a stand-alone
  // effect inputPad is 0 and this reduces to clamp(p).
  let iDims = max(u.inputDimsAndPad.xy, vec2f(1.0));
  let iPad = u.inputDimsAndPad.z;
  let texCoord = (vec2f(iPad) + clamp(p, vec2f(0.0), vec2f(1.0)) * iDims) / (iDims + vec2f(2.0 * iPad));
  return textureSampleLevel(inputTex, samp, texCoord, 0.0);
}

// Like sampleInput but returns transparent (premultiplied zero) outside the
// input rect instead of repeating the edge texel. Use this for any sample that
// can land in the halo (outputPadding > 0) — clamping there smears the edge
// row/column into opaque streaks.
fn sampleInputOrZero(p: vec2f) -> vec4f {
  let inside = step(vec2f(0.0), p) * step(p, vec2f(1.0));
  return sampleInput(p) * (inside.x * inside.y);
}

// Achromatic tone chain, luma-only. Matches fs_main's scaled locals, so a
// neighbor sample and the center land in the same space and flat regions
// cancel in the high-pass. Exposure is applied in sRGB-luma domain as an
// approximation — it's not physically exact, but center and neighbors get the
// same treatment, which is what the local-contrast signal actually needs.
//
// contrast is the linear factor (1 + p/100) and gamma is the resolved exponent
// (exp2(p/100)); both are passed pre-resolved from fs_main so neutral (p == 0)
// is an exact identity here too.
fn toneLuma(srgb: vec3f, exposure: f32, contrast: f32, blackPoint: f32,
            whitePoint: f32, highlights: f32, shadows: f32, gamma: f32) -> f32 {
  var l = dot(srgb, vec3f(0.2126, 0.7152, 0.0722));
  l = l * exp2(exposure);
  l = (l - 0.5) * contrast + 0.5;
  l = clamp((l - blackPoint) / max(whitePoint - blackPoint, 1e-5), 0.0, 1.0);
  let hm = smoothstep(0.5, 1.0, l);
  let sm = smoothstep(0.5, 0.0, l);
  l = clamp(l + highlights * hm + shadows * sm, 0.0, 1.0);
  l = pow(max(l, 0.0), 1.0 / gamma);
  return l;
}

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

@fragment fn fs_main(@location(0) outputUv_in: vec2f) -> @location(0) vec4f {
  let time = u.frameData.x;
  let outputUv = outputUv_in;
  let dims = max(u.frameData.yz, vec2f(1.0));
  let outputPad = u.frameData.w;
  let inputDims = max(u.inputDimsAndPad.xy, vec2f(1.0));
  let inputPad = u.inputDimsAndPad.z;
  let inputTexel = vec2f(1.0) / inputDims;
  let fragPx = outputUv * dims;
  let contentOriginPx = vec2f(inputPad + outputPad);
  let uv = (fragPx - contentOriginPx) / inputDims;
  // texel and aspect are input-relative to match uv; for unpadded effects and
  // all fills inputDims === dims so this is unchanged. Zoom fills rescale texel
  // alongside their uv redefinition below (see zoomLocal).
  let texel = inputTexel;
  let aspect = inputDims.x / max(inputDims.y, 1.0);

  // --- Raw control values (signed-percent UI, neutral at 0) ---
  // Every push-style control is now signed -100..+100 with neutral 0,
  // including exposure and the black/white point levels pair — there are no
  // remaining unit exceptions. We keep the raw values around for the neutral
  // early-out, then resolve them into the working factors the tone chain
  // expects.
  let exposureRaw = u.exposure.x;              // %, neutral 0
  let contrastRaw = u.contrast.x;              // %, neutral 0
  let blackPointRaw = u.blackPoint.x;          // %, neutral 0
  let whitePointRaw = u.whitePoint.x;          // %, neutral 0
  let highlightsRaw = u.highlights.x;          // %, neutral 0
  let shadowsRaw = u.shadows.x;                // %, neutral 0
  let gammaRaw = u.gamma.x;                    // %, neutral 0
  let temperatureRaw = u.temperature.x;        // %, neutral 0
  let tintRaw = u.tint.x;                      // %, neutral 0
  let colorFilter = u.colorFilter;             // rgba, neutral a==0 or rgb==1
  let vibranceRaw = u.vibrance.x;              // %, neutral 0
  let saturationRaw = u.saturation.x;          // %, neutral 0
  let brillianceRaw = u.brilliance.x;          // %, neutral 0
  let definitionRaw = u.definition.x;          // %, neutral 0

  let inputColor = sampleInput(uv);

  // Neutral early-out: when nothing is touched, return the source untouched so
  // an unedited image is bit-exact (no sRGB round-trip rounding, no level/gamma
  // drift). A white or fully-transparent color filter is also neutral.
  let cfNeutral = (colorFilter.a == 0.0) ||
                  (colorFilter.r == 1.0 && colorFilter.g == 1.0 && colorFilter.b == 1.0);
  let neutral =
    exposureRaw == 0.0 &&
    contrastRaw == 0.0 &&
    blackPointRaw == 0.0 &&
    whitePointRaw == 0.0 &&
    highlightsRaw == 0.0 &&
    shadowsRaw == 0.0 &&
    gammaRaw == 0.0 &&
    temperatureRaw == 0.0 &&
    tintRaw == 0.0 &&
    cfNeutral &&
    vibranceRaw == 0.0 &&
    saturationRaw == 0.0 &&
    brillianceRaw == 0.0 &&
    definitionRaw == 0.0;
  if (neutral) {
    return inputColor;
  }

  // --- Resolve UI values into working factors ---
  // contrast/saturation: 1 + p/100  -> -100 = 0x, 0 = 1x (identity), +100 = 2x.
  // gamma: exp2(p/100)              -> -100 ~ 0.5, 0 = 1.0 (identity), +100 ~ 2.0.
  // exposure: ±100 maps to ±4 stops (the old EV range); 0 = identity.
  let exposure = exposureRaw / 100.0 * 4.0;
  let contrast = 1.0 + contrastRaw / 100.0;
  // Levels: signed ±100 around neutral. Black point raises (>0) or lifts (<0)
  // the shadow floor; white point clips (>0) or compresses (<0) the highlight
  // ceiling. ±100 reaches the old one-directional extremes (floor 0.5 /
  // ceiling 0.5); the opposite sign adds the previously-missing faded look.
  let blackPoint = blackPointRaw / 100.0 * 0.5;
  let whitePoint = 1.0 - whitePointRaw / 100.0 * 0.5;
  let highlights = highlightsRaw / 100.0;
  let shadows = shadowsRaw / 100.0;
  let gamma = exp2(gammaRaw / 100.0);
  let temperature = temperatureRaw / 100.0;
  let tint = tintRaw / 100.0;
  let vibrance = vibranceRaw / 100.0;
  let saturation = 1.0 + saturationRaw / 100.0;
  let brilliance = brillianceRaw / 100.0;
  let definition = definitionRaw / 100.0;

  // --- sRGB linearize helper (applied to sampled color) ---
  // inputColor is already sampled; linearize it
  let srgbC = inputColor.rgb;
  var linR = select(srgbC.x / 12.92, pow((srgbC.x + 0.055) / 1.055, 2.4), srgbC.x > 0.04045);
  var linG = select(srgbC.y / 12.92, pow((srgbC.y + 0.055) / 1.055, 2.4), srgbC.y > 0.04045);
  var linB = select(srgbC.z / 12.92, pow((srgbC.z + 0.055) / 1.055, 2.4), srgbC.z > 0.04045);
  var rgb = vec3f(linR, linG, linB);
  // 1. White Balance (linear light) — Temperature (blue/orange) + Tint (green/magenta)
  rgb.x *= 1.0 + temperature * 0.3;
  rgb.z *= 1.0 - temperature * 0.3;
  rgb.y *= 1.0 + tint * 0.3;
  // 2. Exposure (linear light)
  rgb *= exp2(exposure);
  // 3. Color Filter (linear light) — blend tint by its alpha
  rgb = mix(rgb, rgb * colorFilter.rgb, colorFilter.a);
  // --- switch to perceptual: encode to sRGB gamma ---
  var cR = select(rgb.x * 12.92, pow(max(rgb.x, 0.0), 1.0/2.4) * 1.055 - 0.055, rgb.x > 0.0031308);
  var cG = select(rgb.y * 12.92, pow(max(rgb.y, 0.0), 1.0/2.4) * 1.055 - 0.055, rgb.y > 0.0031308);
  var cB = select(rgb.z * 12.92, pow(max(rgb.z, 0.0), 1.0/2.4) * 1.055 - 0.055, rgb.z > 0.0031308);
  var c = vec3f(cR, cG, cB);
  // 4. Contrast
  c = (c - 0.5) * contrast + 0.5;
  // 5. Levels
  c = clamp((c - blackPoint) / max(whitePoint - blackPoint, 1e-5), vec3f(0.0), vec3f(1.0));
  // 6. Highlights & Shadows
  var luma = dot(c, vec3f(0.2126, 0.7152, 0.0722));
  let highlightMask = smoothstep(0.5, 1.0, luma);
  let shadowMask = smoothstep(0.5, 0.0, luma);
  c = clamp(c + highlights * highlightMask + shadows * shadowMask, vec3f(0.0), vec3f(1.0));
  // 7. Gamma
  c = pow(max(c, vec3f(0.0)), vec3f(1.0 / gamma));
  // 8. Brilliance — positive adds pop: deepen shadows, lift highlights
  let bLuma = dot(c, vec3f(0.2126, 0.7152, 0.0722));
  let shadowDeepen   = -brilliance * smoothstep(0.5, 0.0, bLuma) * 0.4;
  let highlightBoost =  brilliance * smoothstep(0.5, 1.0, bLuma) * 0.4;
  c = clamp(c + shadowDeepen + highlightBoost, vec3f(0.0), vec3f(1.0));
  // 9. Vibrance
  luma = dot(c, vec3f(0.2126, 0.7152, 0.0722));
  let currentSat = max(c.x, max(c.y, c.z)) - min(c.x, min(c.y, c.z));
  let effective = vibrance * (1.0 - currentSat);
  c = clamp(mix(vec3f(luma), c, 1.0 + effective), vec3f(0.0), vec3f(1.0));
  // 10. Saturation
  luma = dot(c, vec3f(0.2126, 0.7152, 0.0722));
  c = mix(vec3f(luma), c, saturation);
  // 11. Definition / Clarity — local contrast from a tone-consistent neighborhood
  let defFrac = 0.006;                         // radius as fraction of width; tune to taste
  let off = vec2f(defFrac, defFrac * aspect);  // equal pixel distance on both axes
  let dN = toneLuma(sampleInput(clamp(uv + vec2f(0.0, -off.y), vec2f(0.0), vec2f(1.0))).rgb, exposure, contrast, blackPoint, whitePoint, highlights, shadows, gamma);
  let dS = toneLuma(sampleInput(clamp(uv + vec2f(0.0,  off.y), vec2f(0.0), vec2f(1.0))).rgb, exposure, contrast, blackPoint, whitePoint, highlights, shadows, gamma);
  let dE = toneLuma(sampleInput(clamp(uv + vec2f( off.x, 0.0), vec2f(0.0), vec2f(1.0))).rgb, exposure, contrast, blackPoint, whitePoint, highlights, shadows, gamma);
  let dW = toneLuma(sampleInput(clamp(uv + vec2f(-off.x, 0.0), vec2f(0.0), vec2f(1.0))).rgb, exposure, contrast, blackPoint, whitePoint, highlights, shadows, gamma);
  let localLuma = (dN + dS + dE + dW) * 0.25;
  let lumaCtr = toneLuma(inputColor.rgb, exposure, contrast, blackPoint, whitePoint, highlights, shadows, gamma);
  let midtoneMask = 1.0 - abs(lumaCtr - 0.5) * 2.0;
  let boost = definition * (lumaCtr - localLuma) * midtoneMask;
  c = clamp(c + boost, vec3f(0.0), vec3f(1.0));
  return vec4f(c, inputColor.a);
}
`;
    frame.state.module = device.createShaderModule({ code: wgsl });
    frame.state.pipeline = null;
    frame.state.pipelineFormat = null;
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
    frame.state.uniformBuf = device.createBuffer({
        size: 256,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    frame.state.sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
    });
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
    function boolParam(name, fallback) {
        if (typeof params[name] === 'boolean')
            return params[name] ? 1 : 0;
        return fallback ? 1 : 0;
    }
    function selectParam(name, values, fallbackIndex) {
        var raw = params[name];
        var value = raw != null && typeof raw === 'object' ? raw.characters : raw;
        var index = values.indexOf(value);
        return index >= 0 ? index : fallbackIndex;
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
    function pointParam(name, fallback) {
        var value = params[name] || {};
        return [
            finiteNumber(value.x, fallback[0]),
            finiteNumber(value.y, fallback[1]),
        ];
    }
    function pointRadiusParam(name, fallback) {
        var value = params[name] || {};
        return [
            finiteNumber(value.x, fallback[0]),
            finiteNumber(value.y, fallback[1]),
            finiteNumber(value.radius, fallback[2]),
        ];
    }
    function pointPointLineParam(name, fallback) {
        var value = params[name] || {};
        return [
            finiteNumber(value.x, fallback[0]),
            finiteNumber(value.y, fallback[1]),
            finiteNumber(value.x2, fallback[2]),
            finiteNumber(value.y2, fallback[3]),
        ];
    }
    function pointAngleRadiusParam(name, fallback) {
        var value = params[name] || {};
        return [
            finiteNumber(value.x, fallback[0]),
            finiteNumber(value.y, fallback[1]),
            finiteNumber(value.radius, fallback[2]),
            finiteNumber(value.angle, fallback[3]),
        ];
    }
    function colorPointParam(name, fallback) {
        var value = params[name] || {};
        var color = value.color || {};
        return [
            finiteNumber(value.x, fallback[0]),
            finiteNumber(value.y, fallback[1]),
            0,
            0,
            finiteNumber(color.r, fallback[2]),
            finiteNumber(color.g, fallback[3]),
            finiteNumber(color.b, fallback[4]),
            finiteNumber(color.a, fallback[5]),
        ];
    }
    function gradientParam(name, fallback) {
        var value = params[name] || {};
        var stops = Array.isArray(value.stops) && value.stops.length > 0 ? value.stops : fallback;
        // Layout: 8 stop colors (rgba), then 8 positions packed 4-per-vec4, then the live count.
        var out = new Array(44).fill(0);
        var count = Math.min(stops.length, 8);
        for (var i = 0; i < count; i++) {
            var stop = stops[i] || {};
            var color = stop.color || {};
            out[i * 4] = finiteNumber(color.r, 0);
            out[i * 4 + 1] = finiteNumber(color.g, 0);
            out[i * 4 + 2] = finiteNumber(color.b, 0);
            out[i * 4 + 3] = finiteNumber(color.a, 1);
            out[32 + i] = finiteNumber(stop.position, 0);
        }
        out[40] = count;
        return out;
    }
    var output = frame.output || {};
    var width = Math.max(1, finiteNumber(output.width, 1));
    var height = Math.max(1, finiteNumber(output.height, 1));
    var time = 0;
    var outputPad = finiteNumber(frame.outputPadding, 0);
    var inputPad = finiteNumber(frame.inputPadding, 0);
    var inputWidth = Math.max(1, width - 2 * outputPad);
    var inputHeight = Math.max(1, height - 2 * outputPad);
    device.queue.writeBuffer(frame.state.uniformBuf, 0, new Float32Array([
        time, width, height, outputPad,
        inputWidth, inputHeight, inputPad, 0,
        numberParam("exposure", 0), 0, 0, 0,
        numberParam("contrast", 0), 0, 0, 0,
        numberParam("blackPoint", 0), 0, 0, 0,
        numberParam("whitePoint", 0), 0, 0, 0,
        numberParam("highlights", 0), 0, 0, 0,
        numberParam("shadows", 0), 0, 0, 0,
        numberParam("gamma", 0), 0, 0, 0,
        numberParam("temperature", 0), 0, 0, 0,
        numberParam("tint", 0), 0, 0, 0,
        ...colorParam("colorFilter", [1, 1, 1, 1]),
        numberParam("vibrance", 0), 0, 0, 0,
        numberParam("saturation", 0), 0, 0, 0,
        numberParam("brilliance", 0), 0, 0, 0,
        numberParam("definition", 0), 0, 0, 0,
    ]));
    var inputView = frame.input != null
        ? frame.input.createView()
        : frame.state.placeholder.createView();
    var outputFormat = frame.output.format;
    if (frame.state.pipeline == null || frame.state.pipelineFormat !== outputFormat) {
        frame.state.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: frame.state.module,
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
                module: frame.state.module,
                entryPoint: 'fs_main',
                targets: [{ format: outputFormat }],
            },
            primitive: { topology: 'triangle-list' },
        });
        frame.state.pipelineFormat = outputFormat;
    }
    var bindGroup = device.createBindGroup({
        layout: frame.state.pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: frame.state.uniformBuf } },
            { binding: 1, resource: frame.state.sampler },
            { binding: 2, resource: inputView },
        ],
    });
    var encoder = device.createCommandEncoder();
    var pass = encoder.beginRenderPass({
        colorAttachments: [{
                view: frame.output.createView(),
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                storeOp: 'store',
            }],
    });
    pass.setPipeline(frame.state.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, frame.state.quad);
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
}
defineProperties(Effect, {
    "exposure": {
        type: "number",
        label: "Exposure",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "contrast": {
        type: "number",
        label: "Contrast",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "blackPoint": {
        type: "number",
        label: "Black point",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "whitePoint": {
        type: "number",
        label: "White point",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "shadows": {
        type: "number",
        label: "Shadows",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "highlights": {
        type: "number",
        label: "Highlights",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "gamma": {
        type: "number",
        label: "Gamma",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "temperature": {
        type: "number",
        label: "Temperature",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "tint": {
        type: "number",
        label: "Tint",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "colorFilter": {
        type: "color",
        label: "Color filter",
        defaultValue: { "r": 1, "g": 1, "b": 1, "a": 1 },
    },
    "vibrance": {
        type: "number",
        label: "Vibrance",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "saturation": {
        type: "number",
        label: "Saturation",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "brilliance": {
        type: "number",
        label: "Brilliance",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
    "definition": {
        type: "number",
        label: "Definition",
        defaultValue: 0,
        control: "slider",
        min: -100,
        max: 100,
        step: 1,
        unit: "%",
    },
});

export const manifest = {
  "name": "Color adjust",
  "version": 2,
  "isAnimated": false,
  "usesMouse": false
}
