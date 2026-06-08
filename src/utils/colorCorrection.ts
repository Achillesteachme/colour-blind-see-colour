/**
 * Daltonization matrices for color blindness simulation and correction.
 * Each matrix remaps RGB values so distinguishable hues shift into ranges
 * visible to the affected eye type.
 *
 * Applied as a 3x3 matrix multiply on normalized [0,1] RGB values.
 */

export type ColorBlindType = 'deuteranopia' | 'protanopia' | 'tritanopia';

export const COLOR_BLIND_TYPES: { id: ColorBlindType; label: string; description: string }[] = [
  {
    id: 'deuteranopia',
    label: 'Red-Green (Green)',
    description: 'Most common — reduced sensitivity to green light',
  },
  {
    id: 'protanopia',
    label: 'Red-Green (Red)',
    description: 'Reduced sensitivity to red light',
  },
  {
    id: 'tritanopia',
    label: 'Blue-Yellow',
    description: 'Reduced sensitivity to blue light',
  },
];

/**
 * Correction matrices boost contrast along the affected axis.
 * Values derived from the Machado et al. (2009) daltonization method.
 */
export const CORRECTION_MATRICES: Record<ColorBlindType, number[]> = {
  // Shifts greens toward yellow/orange, boosts red-green contrast
  deuteranopia: [
    1.0, 0.0, 0.0,
    0.4942, 0.0, 1.2483,
    0.0, 0.0, 1.0,
  ],
  // Shifts reds toward orange/yellow, boosts luminance channel
  protanopia: [
    0.0, 2.0234, -2.5258,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0,
  ],
  // Shifts blues toward cyan, boosts blue-yellow contrast
  tritanopia: [
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    -0.395913, 0.801109, 0.0,
  ],
};

/**
 * Returns a GLSL fragment shader source string for the given correction type.
 * Used by VisionCamera frame processors.
 */
export function getShaderSource(type: ColorBlindType): string {
  const m = CORRECTION_MATRICES[type];
  return `
    precision mediump float;
    uniform sampler2D inputTexture;
    varying vec2 vTexCoord;

    void main() {
      vec4 color = texture2D(inputTexture, vTexCoord);
      float r = color.r;
      float g = color.g;
      float b = color.b;

      float nr = ${m[0].toFixed(6)} * r + ${m[1].toFixed(6)} * g + ${m[2].toFixed(6)} * b;
      float ng = ${m[3].toFixed(6)} * r + ${m[4].toFixed(6)} * g + ${m[5].toFixed(6)} * b;
      float nb = ${m[6].toFixed(6)} * r + ${m[7].toFixed(6)} * g + ${m[8].toFixed(6)} * b;

      gl_FragColor = vec4(clamp(nr, 0.0, 1.0), clamp(ng, 0.0, 1.0), clamp(nb, 0.0, 1.0), color.a);
    }
  `;
}

/**
 * CPU-side correction for captured still images (pixel-by-pixel fallback).
 * Returns corrected [r, g, b] from input [r, g, b] each in 0-255 range.
 */
export function correctPixel(type: ColorBlindType, r: number, g: number, b: number): [number, number, number] {
  const m = CORRECTION_MATRICES[type];
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const nr = Math.min(1, Math.max(0, m[0] * rn + m[1] * gn + m[2] * bn));
  const ng = Math.min(1, Math.max(0, m[3] * rn + m[4] * gn + m[5] * bn));
  const nb = Math.min(1, Math.max(0, m[6] * rn + m[7] * gn + m[8] * bn));

  return [Math.round(nr * 255), Math.round(ng * 255), Math.round(nb * 255)];
}
