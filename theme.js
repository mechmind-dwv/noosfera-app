// theme.js
// Paleta de NOÓSFERA — instrumentación de campo, no dashboard de fitness.

export const colors = {
  void: '#0a0e14',
  void2: '#10151e',
  paper: '#e8e2d4',
  paperDim: '#9a9484',
  gold: '#c9a655',
  goldDim: '#7d6a3f',
  equilibrium: '#4a9b7f',
  perturbation: '#c1542c',
  line: 'rgba(232,226,212,0.12)',
  lineBright: 'rgba(201,166,85,0.35)',
};

export function stateForIndex(idx) {
  if (idx < 25) return { label: 'EQUILIBRIO ENTRÓPICO', color: colors.equilibrium };
  if (idx < 50) return { label: 'FLUJO DISIPATIVO ACTIVO', color: colors.gold };
  return { label: 'PERTURBACIÓN · RUIDO', color: colors.perturbation };
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
