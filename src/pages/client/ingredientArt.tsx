import React from 'react';
import { ChefHat } from 'lucide-react';

// Ilustraciones propias (SVG) de cada ingrediente del creador interactivo.
// Cada arte es una capa de 240px de ancho; se usa apilada en el escenario de la
// hamburguesa y, recortada al centro, como miniatura en las listas.

export type ArtKind =
  | 'brioche' | 'pretzel' | 'patty' | 'chicken' | 'bacon' | 'cheese' | 'tomato'
  | 'lettuce' | 'arugula' | 'cilantro' | 'coleslaw' | 'onionRed' | 'onionPickled'
  | 'mayo' | 'creamSauce' | 'glazeSauce';

export const BUN_KINDS: ArtKind[] = ['brioche', 'pretzel'];

export function artKind(name: string): ArtKind | null {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('brioche') || n.includes('sesamo')) return 'brioche';
  if (n.includes('pretzel')) return 'pretzel';
  if (n.includes('pollo')) return 'chicken';
  if (n.includes('tocino') || n.includes('tocineta') || n.includes('bacon')) return 'bacon';
  if (n.includes('carne') || n.includes('res ')) return 'patty';
  if (n.includes('queso') || n.includes('cheddar')) return 'cheese';
  if (n.includes('tomate')) return 'tomato';
  if (n.includes('rucula')) return 'arugula';
  if (n.includes('cilantro')) return 'cilantro';
  if (n.includes('lechuga')) return 'lettuce';
  if (n.includes('col') && n.includes('ensalada')) return 'coleslaw';
  if (n.includes('cebolla') && (n.includes('encurt') || n.includes('pickle'))) return 'onionPickled';
  if (n.includes('cebolla')) return 'onionRed';
  if (n.includes('mayonesa')) return 'mayo';
  if (n.includes('glaseada')) return 'glazeSauce';
  if (n.includes('salsa') || n.includes('crema')) return 'creamSauce';
  return null;
}

/** Factor de escala de las capas en el escenario. */
const K = 1.3;

/** Espacio vacío [arriba, abajo] dentro de cada capa, para que el contenido visible quede pegado al vecino. */
const PAD: Partial<Record<ArtKind, [number, number]>> = {
  patty: [3, 3], chicken: [4, 3], bacon: [7, 2], cheese: [3, 9], tomato: [1, 2], lettuce: [8, 5],
  arugula: [3, 8], cilantro: [5, 6], coleslaw: [8, 4], onionRed: [3, 3], onionPickled: [3, 3],
  mayo: [2, 12], creamSauce: [2, 12], glazeSauce: [2, 12],
};

const rnd = (i: number, max: number) => (((i * 9301 + 49297) % 233280) / 233280) * max;

const waveTop = (w: number, y: number, amp: number, step: number) => {
  let d = `M0 ${y}`;
  for (let x = 0; x < w; x += step) d += ` q${step / 4} ${-amp} ${step / 2} 0 t${step / 2} 0`;
  return d;
};
const waveBack = (w: number, amp: number, step: number) => {
  let d = '';
  for (let x = 0; x < w; x += step) d += ` q${-step / 4} ${amp} ${-step / 2} 0 t${-step / 2} 0`;
  return d;
};

// Filtros compartidos: relieve de miga/empanizado, borde irregular y sombra de contacto.
const FX = (
  <defs>
    <filter id="fx-bump" x="-3%" y="-8%" width="106%" height="116%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="4" result="n" />
      <feDiffuseLighting in="n" lightingColor="#ffffff" surfaceScale="1.8" result="l">
        <feDistantLight azimuth="235" elevation="58" />
      </feDiffuseLighting>
      <feComposite in="l" in2="SourceGraphic" operator="arithmetic" k1="1.3" k2="0" k3="0" k4="0" result="m" />
      <feComposite in="m" in2="SourceAlpha" operator="in" />
    </filter>
    <filter id="fx-rough" x="-4%" y="-12%" width="108%" height="124%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.09" numOctaves="2" seed="7" result="w" />
      <feDisplacementMap in="SourceGraphic" in2="w" scale="6" xChannelSelector="R" yChannelSelector="G" result="d" />
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="11" result="n" />
      <feDiffuseLighting in="n" lightingColor="#ffffff" surfaceScale="2.2" result="l">
        <feDistantLight azimuth="235" elevation="55" />
      </feDiffuseLighting>
      <feComposite in="l" in2="d" operator="arithmetic" k1="1.3" k2="0" k3="0" k4="0" result="m" />
      <feComposite in="m" in2="d" operator="in" />
    </filter>
    <filter id="fx-soft" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="1.6" /></filter>
    <filter id="fx-blur3" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="3" /></filter>
  </defs>
);

interface Art {
  h: number;
  overlap: number;
  tint: string;
  draw: () => React.ReactNode;
}

const ART: Record<ArtKind, Art> = {
  patty: {
    h: 40, overlap: -5, tint: '#f3e3d8',
    draw: () => (
      <>
        {FX}
        <defs>
          <radialGradient id="g-patty" cx=".4" cy=".2" r=".9">
            <stop offset="0" stopColor="#5a3018" /><stop offset=".55" stopColor="#5a3018" /><stop offset="1" stopColor="#5a3018" />
          </radialGradient>
          <clipPath id="c-patty"><path d="M6 20 C4 8 22 4 60 5 C110 3 170 3 214 5 C238 7 238 26 228 31 C200 38 40 38 14 31 C6 28 6 24 6 20 Z" /></clipPath>
        </defs>
        <ellipse cx="120" cy="35" rx="108" ry="4" fill="#000" opacity=".28" />
        <g>
          <path d="M6 20 C4 8 22 4 60 5 C110 3 170 3 214 5 C238 7 238 26 228 31 C200 38 40 38 14 31 C6 28 6 24 6 20 Z" fill="url(#g-patty)" stroke="#2a1208" strokeWidth="2.5" />
        </g>
        <g clipPath="url(#c-patty)">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <path key={i} d={`M${16 + i * 21} 6 l14 22`} stroke="#150803" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
          ))}
          <ellipse cx="88" cy="9" rx="66" ry="3" fill="#ffd9b0" opacity=".28" />
          
        </g>
      </>
    ),
  },
  chicken: {
    h: 42, overlap: -5, tint: '#fbecd0',
    draw: () => (
      <>
        {FX}
        <defs>
          <radialGradient id="g-chicken" cx=".4" cy=".2" r=".95">
            <stop offset="0" stopColor="#d9902f" /><stop offset=".6" stopColor="#d9902f" /><stop offset="1" stopColor="#d9902f" />
          </radialGradient>
        </defs>
        <ellipse cx="120" cy="37" rx="108" ry="4" fill="#000" opacity=".28" />
        <g>
          <path d="M6 22 C4 9 26 5 70 6 C120 3 180 5 216 7 C240 9 238 28 226 34 C196 40 46 40 16 34 C6 31 6 26 6 22 Z" fill="url(#g-chicken)" stroke="#8a4d10" strokeWidth="2.5" />
          {Array.from({ length: 30 }).map((_, i) => (
            <circle key={`t${i}`} cx={12 + rnd(i + 2, 216)} cy={9 + rnd(i + 5, 24)} r={3 + rnd(i, 4)} fill={i % 2 ? '#efb454' : '#c98024'} />
          ))}
        </g>
        <ellipse cx="90" cy="10" rx="64" ry="3" fill="#fff2cc" opacity=".3" />
      </>
    ),
  },
  bacon: {
    h: 32, overlap: -5, tint: '#fbe2dc',
    draw: () => {
      const strip = (y: number, id: string, rot: number) => (
        <g transform={`rotate(${rot} 120 ${y})`}>
          <path d={`${waveTop(240, y, 5, 24)} L240 ${y + 11}${waveBack(240, 5, 24)} Z`} fill={`url(#${id})`} />
          <path d={waveTop(240, y + 3, 5, 24)} fill="none" stroke="#f6c9b6" strokeWidth="2.6" strokeLinecap="round" opacity=".9" />
          <path d={waveTop(240, y + 8, 5, 24)} fill="none" stroke="#f1b5a0" strokeWidth="2" strokeLinecap="round" opacity=".75" />
          <path d={waveTop(240, y + 0.8, 5, 24)} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".35" />
        </g>
      );
      return (
        <>
          {FX}
          <defs>
            <linearGradient id="g-bacon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8382b" /><stop offset="1" stopColor="#b8382b" /></linearGradient>
            <linearGradient id="g-bacon2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8301f" /><stop offset="1" stopColor="#a8301f" /></linearGradient>
          </defs>
          <ellipse cx="120" cy="27" rx="106" ry="3.5" fill="#000" opacity=".25" />
          {strip(12, 'g-bacon', -1.2)}
          {strip(19, 'g-bacon2', 0.8)}
        </>
      );
    },
  },
  cheese: {
    h: 32, overlap: -4, tint: '#fff2c9',
    draw: () => (
      <>
        {FX}
        <defs>
          <linearGradient id="g-cheese" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f9b910" /><stop offset=".6" stopColor="#f9b910" /><stop offset="1" stopColor="#f9b910" />
          </linearGradient>
        </defs>
        <ellipse cx="120" cy="22" rx="104" ry="4" fill="#000" opacity=".22" />
        <path d="M2 5 Q4 2 12 3 L230 3 Q238 3 238 8 Q234 14 226 14 H14 Q6 14 2 5 Z" fill="url(#g-cheese)" stroke="#d9960a" strokeWidth=".8" />
        {[[30, 12, 6], [70, 12, 3], [118, 12, 8], [164, 12, 4], [208, 12, 7]].map(([x, y, len]) => (
          <path key={x} d={`M${x} ${y} v${len} q0 6 6 6 q6 0 6 -6 v-${len} z`} fill="url(#g-cheese)" stroke="#d9960a" strokeWidth=".8" />
        ))}
        <path d="M10 6 Q120 3 228 6" stroke="#fff" strokeOpacity=".7" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M4 13 H236" stroke="#b97300" strokeOpacity=".35" strokeWidth="1.5" />
      </>
    ),
  },
  tomato: {
    h: 26, overlap: -4, tint: '#fde0dd',
    draw: () => (
      <>
        {FX}
        <defs>
          <radialGradient id="g-tom" cx=".5" cy=".4" r=".7">
            <stop offset="0" stopColor="#e2342a" /><stop offset=".7" stopColor="#e2342a" /><stop offset="1" stopColor="#e2342a" />
          </radialGradient>
        </defs>
        <ellipse cx="120" cy="21" rx="104" ry="3.5" fill="#000" opacity=".25" />
        {[46, 120, 194].map((cx, i) => (
          <g key={cx}>
            <ellipse cx={cx} cy="12" rx="47" ry="11" fill="#a3140f" />
            <ellipse cx={cx} cy="12" rx="44" ry="9.4" fill="url(#g-tom)" stroke="#a3140f" strokeWidth="1.5" />
            {[-26, -13, 0, 13, 26].map((dx, k) => (
              <g key={k}>
                <ellipse cx={cx + dx} cy={12 + (k % 2 ? 1.2 : -1.2)} rx="5.5" ry="3.4" fill="#ffb59f" opacity=".85" />
                <ellipse cx={cx + dx} cy={12 + (k % 2 ? 1.2 : -1.2)} rx="3" ry="1.7" fill="#ffe9a6" />
                <circle cx={cx + dx - 1} cy={11 + (k % 2 ? 1.2 : -1.2)} r=".7" fill="#e6c46a" />
              </g>
            ))}
            <ellipse cx={cx - 8 + i * 2} cy="8.2" rx="26" ry="1.6" fill="#fff" opacity=".4" />
          </g>
        ))}
      </>
    ),
  },
  lettuce: {
    h: 34, overlap: -7, tint: '#e4f4d6',
    draw: () => (
      <>
        {FX}
        <defs>
          <linearGradient id="g-let" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6db83a" /><stop offset=".55" stopColor="#6db83a" /><stop offset="1" stopColor="#6db83a" />
          </linearGradient>
          <linearGradient id="g-let2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8ed255" /><stop offset="1" stopColor="#8ed255" />
          </linearGradient>
        </defs>
        <ellipse cx="120" cy="28" rx="106" ry="3.5" fill="#000" opacity=".22" />
        <path d={`${waveTop(240, 22, 9, 16)} L240 26${waveBack(240, 4, 16)} Z`} fill="url(#g-let2)" />
        <path d={`${waveTop(240, 15, 10, 26)} L240 24${waveBack(240, 7, 26)} Z`} fill="url(#g-let)" stroke="#3c7f1c" strokeWidth="2" />
        <path d={waveTop(240, 16, 10, 26)} fill="none" stroke="#dbf5b3" strokeWidth="2.4" strokeLinecap="round" opacity=".8" />
        {[14, 40, 66, 92, 118, 144, 170, 196, 222].map((x, i) => (
          <path key={x} d={`M${x} 22 q3 -5 7 -${5 + (i % 3)}`} stroke="#d7f2ae" strokeWidth="1" fill="none" strokeLinecap="round" opacity=".8" />
        ))}
      </>
    ),
  },
  arugula: {
    h: 30, overlap: -5, tint: '#e0f1d2',
    draw: () => (
      <>
        {FX}
        <rect x="6" y="15" width="228" height="7" rx="3.5" fill="#2f7d2c" />
        {Array.from({ length: 10 }).map((_, i) => (
          <g key={i} transform={`translate(${8 + i * 22} ${15 + (i % 2) * 2}) rotate(${(i % 2 ? 22 : -25) + rnd(i, 10)})`}>
            <path d="M0 0 C4 -13 16 -13 24 -1 C22 5 12 6 0 0 Z" fill={i % 3 ? '#3fa03a' : '#2f8a2f'} stroke="#226a22" strokeWidth=".8" />
            <path d="M1 -1 L20 -3" stroke="#a6dc6c" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        ))}
      </>
    ),
  },
  cilantro: {
    h: 26, overlap: -4, tint: '#e2f3d6',
    draw: () => (
      <>
        {FX}
        <rect x="6" y="14" width="228" height="5" rx="2.5" fill="#3b8f37" />
        {Array.from({ length: 12 }).map((_, i) => {
          const x = 14 + i * 19;
          return (
            <g key={i}>
              <circle cx={x} cy="11" r="5.5" fill="#54b24a" stroke="#2f7d2c" strokeWidth=".8" />
              <circle cx={x + 6} cy="14" r="4.5" fill="#6cc55e" stroke="#2f7d2c" strokeWidth=".8" />
              <circle cx={x - 5} cy="15" r="4" fill="#48a13f" stroke="#2f7d2c" strokeWidth=".8" />
            </g>
          );
        })}
      </>
    ),
  },
  coleslaw: {
    h: 32, overlap: -5, tint: '#f6f1dc',
    draw: () => (
      <>
        {FX}
        <rect x="6" y="8" width="228" height="20" rx="10" fill="#f4efd6" stroke="#d8d0a8" strokeWidth="1.2" />
        {Array.from({ length: 34 }).map((_, i) => {
          const x = 12 + rnd(i + 1, 216);
          const y = 10 + rnd(i + 9, 16);
          const c = ['#c7e09b', '#e6d3ef', '#ffffff', '#d3c2e3', '#b9d98a'][i % 5];
          return <path key={i} d={`M${x} ${y} q6 -5 12 ${i % 2 ? 3 : -2}`} stroke={c} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
        })}
      </>
    ),
  },
  onionRed: {
    h: 24, overlap: -3, tint: '#f3dcef',
    draw: () => (
      <>
        {FX}
        {[30, 78, 126, 174, 212].map((cx, i) => (
          <g key={cx}>
            <ellipse cx={cx} cy="12" rx="26" ry="9" fill="none" stroke="#8e2f80" strokeWidth="3.4" />
            <ellipse cx={cx} cy="12" rx="19" ry="5.5" fill="none" stroke="#d27ec2" strokeWidth="2.2" />
            <ellipse cx={cx} cy="12" rx="11" ry="2.8" fill="none" stroke="#efb5e3" strokeWidth="1.4" opacity={i % 2 ? 0.9 : 0.6} />
          </g>
        ))}
      </>
    ),
  },
  onionPickled: {
    h: 24, overlap: -3, tint: '#fbe6ec',
    draw: () => (
      <>
        {FX}
        {[40, 96, 152, 208].map(cx => (
          <g key={cx}>
            <ellipse cx={cx} cy="12" rx="28" ry="9" fill="#f7cbd6" fillOpacity=".7" stroke="#e08ea6" strokeWidth="3" />
            <ellipse cx={cx} cy="12" rx="19" ry="5.5" fill="none" stroke="#fbe0e7" strokeWidth="2" />
            <circle cx={cx - 8} cy="9" r="1.2" fill="#c9506f" />
            <circle cx={cx + 9} cy="15" r="1.2" fill="#c9506f" />
          </g>
        ))}
      </>
    ),
  },
  mayo: {
    h: 22, overlap: -2, tint: '#fde3d2',
    draw: () => (
      <>
        {FX}
        <defs>
          <linearGradient id="g-mayo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f9b17c" /><stop offset="1" stopColor="#f9b17c" />
          </linearGradient>
        </defs>
        <rect x="6" y="2" width="228" height="11" rx="5.5" fill="url(#g-mayo)" stroke="#c4571f" strokeWidth="1" />
        {[40, 110, 170, 214].map((x, i) => (
          <path key={x} d={`M${x} 10 v${5 + (i % 2) * 4} a3.5 3.5 0 0 0 7 0 v-${5 + (i % 2) * 4} z`} fill="url(#g-mayo)" stroke="#c4571f" strokeWidth=".8" />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <circle key={i} cx={14 + rnd(i + 4, 210)} cy={4 + rnd(i + 8, 7)} r="1" fill="#b3261e" />
        ))}
        <line x1="16" y1="5" x2="200" y2="5" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  creamSauce: {
    h: 22, overlap: -2, tint: '#fbf1d8',
    draw: () => (
      <>
        {FX}
        <defs>
          <linearGradient id="g-cream" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#fffaf0" />
          </linearGradient>
        </defs>
        <rect x="6" y="2" width="228" height="11" rx="5.5" fill="url(#g-cream)" stroke="#d1bb8a" strokeWidth="1" />
        {[30, 84, 150, 200].map((x, i) => (
          <path key={x} d={`M${x} 10 v${5 + (i % 2) * 4} a3.5 3.5 0 0 0 7 0 v-${5 + (i % 2) * 4} z`} fill="url(#g-cream)" stroke="#d1bb8a" strokeWidth=".8" />
        ))}
        <line x1="16" y1="5" x2="190" y2="5" stroke="#fff" strokeOpacity=".8" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  glazeSauce: {
    h: 22, overlap: -2, tint: '#f1dccb',
    draw: () => (
      <>
        {FX}
        <defs>
          <linearGradient id="g-glaze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a4481a" /><stop offset="1" stopColor="#a4481a" />
          </linearGradient>
        </defs>
        <rect x="6" y="2" width="228" height="11" rx="5.5" fill="url(#g-glaze)" stroke="#3d1704" strokeWidth="1" />
        {[46, 104, 160, 210].map((x, i) => (
          <path key={x} d={`M${x} 10 v${5 + (i % 2) * 4} a3.5 3.5 0 0 0 7 0 v-${5 + (i % 2) * 4} z`} fill="url(#g-glaze)" stroke="#3d1704" strokeWidth=".8" />
        ))}
        <ellipse cx="60" cy="5.5" rx="34" ry="1.8" fill="#fff" opacity=".5" />
        <ellipse cx="170" cy="5.5" rx="22" ry="1.6" fill="#fff" opacity=".4" />
      </>
    ),
  },
  brioche: {
    h: 68, overlap: -6, tint: '#fbe7c8',
    draw: () => (
      <>
        {FX}
        <defs>
          <radialGradient id="g-brioche" cx=".35" cy=".22" r=".95">
            <stop offset="0" stopColor="#dd9a3c" /><stop offset=".45" stopColor="#dd9a3c" /><stop offset="1" stopColor="#dd9a3c" />
          </radialGradient>
        </defs>
        <g>
          <path d="M6 64 C4 18 52 4 120 4 C188 4 236 18 234 64 C230 68 10 68 6 64 Z" fill="url(#g-brioche)" stroke="#8a4708" strokeWidth="3" />
        </g>
        <path d="M8 58 C60 66 180 66 232 58 L233 64 C180 70 60 70 7 64 Z" fill="#7a3f0a" opacity=".45" />
        <path d="M32 24 C60 8 110 6 150 10" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".38" />
        <ellipse cx="78" cy="16" rx="30" ry="4" fill="#fff" opacity=".45" transform="rotate(-10 78 16)" />
        {Array.from({ length: 30 }).map((_, i) => {
          const x = 40 + rnd(i + 2, 160);
          const y = 16 + rnd(i + 6, 34);
          const rot = rnd(i, 180);
          return (
            <g key={i} transform={`rotate(${rot} ${x} ${y})`}>
              <ellipse cx={x + 0.6} cy={y + 1} rx="3.6" ry="1.9" fill="#6b3608" opacity=".4" />
              <ellipse cx={x} cy={y} rx="3.6" ry="1.9" fill="#fff0d0" stroke="#d9b884" strokeWidth=".4" />
              <ellipse cx={x - 1} cy={y - .5} rx="1.6" ry=".6" fill="#fff" opacity=".8" />
            </g>
          );
        })}
      </>
    ),
  },
  pretzel: {
    h: 68, overlap: -6, tint: '#ead7c8',
    draw: () => (
      <>
        {FX}
        <defs>
          <radialGradient id="g-pretzel" cx=".35" cy=".22" r=".95">
            <stop offset="0" stopColor="#7a4120" /><stop offset=".5" stopColor="#7a4120" /><stop offset="1" stopColor="#7a4120" />
          </radialGradient>
        </defs>
        <g>
          <path d="M6 64 C4 18 52 4 120 4 C188 4 236 18 234 64 C230 68 10 68 6 64 Z" fill="url(#g-pretzel)" stroke="#2a1006" strokeWidth="3" />
        </g>
        <path d="M8 58 C60 66 180 66 232 58 L233 64 C180 70 60 70 7 64 Z" fill="#1e0b03" opacity=".5" />
        <path d="M58 30 Q120 12 182 30" fill="none" stroke="#d9a06c" strokeWidth="3.4" strokeLinecap="round" opacity=".75" />
        <path d="M34 26 C60 10 110 8 150 12" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".22" />
        {Array.from({ length: 26 }).map((_, i) => {
          const x = 30 + rnd(i + 3, 176);
          const y = 12 + rnd(i + 9, 38);
          return (
            <g key={i} transform={`rotate(${rnd(i, 90)} ${x} ${y})`}>
              <rect x={x + .6} y={y + .8} width="3.4" height="2.2" rx=".6" fill="#000" opacity=".35" />
              <rect x={x} y={y} width="3.4" height="2.2" rx=".6" fill="#fffdf4" />
            </g>
          );
        })}
      </>
    ),
  },
};

const BUN_BOTTOM: Record<'brioche' | 'pretzel', { fill: string; stroke: string }> = {
  brioche: { fill: 'url(#g-brioche-b)', stroke: '#8a4708' },
  pretzel: { fill: 'url(#g-pretzel-b)', stroke: '#2e1206' },
};

export function renderArtLayer(kind: ArtKind, index: number): React.ReactElement {
  const a = ART[kind];
  return (
    <div
      key={`art-${kind}-${index}`}
      style={{ zIndex: 15 + index, marginTop: -((PAD[kind]?.[0] ?? 3) + 1) * K, marginBottom: -((PAD[kind]?.[1] ?? 3) + 1) * K, width: 240 * K, height: a.h * K, overflowX: 'clip' }}
      className="relative drop-shadow-md select-none transition-all"
      title={kind}
    >
      <svg width={240 * K} height={a.h * K} viewBox={`0 0 240 ${a.h}`} className="overflow-visible">{a.draw()}</svg>
    </div>
  );
}

export function renderBunTop(kind: 'brioche' | 'pretzel'): React.ReactElement {
  const a = ART[kind];
  return (
    <div key={`bun-top-${kind}`} style={{ zIndex: 100, width: 240 * K, height: a.h * K, marginBottom: -7 * K }} className="relative drop-shadow-xl select-none transition-all">
      <svg width={240 * K} height={a.h * K} viewBox={`0 0 240 ${a.h}`} className="overflow-visible">{a.draw()}</svg>
    </div>
  );
}

export function renderBunBottom(kind: 'brioche' | 'pretzel'): React.ReactElement {
  const [c1, c2, edge] = kind === 'brioche' ? ['#e8a755', '#a2591a', '#6f3a0a'] : ['#7d4322', '#33150a', '#1e0b03'];
  const crumb = kind === 'brioche' ? '#f6e3b8' : '#e6cfa6';
  return (
    <div key={`bun-bot-${kind}`} style={{ zIndex: 5, width: 240 * K, height: 34 * K, marginTop: -8 * K }} className="relative drop-shadow-md select-none transition-all">
      <svg width={240 * K} height={34 * K} viewBox="0 0 240 34" className="overflow-visible">
        {FX}
        <defs>
          <linearGradient id={`g-${kind}-b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c1} />
          </linearGradient>
        </defs>
        <g>
          <path d="M8 4 H232 V15 Q234 31 200 31 H40 Q6 31 8 15 Z" fill={`url(#g-${kind}-b)`} stroke={edge} strokeWidth="3" />
        </g>
        <path d="M8 4 Q120 0 232 4 V9 Q120 6 8 9 Z" fill={crumb} opacity=".95" />
        <path d="M10 27 Q120 34 230 27" stroke={edge} strokeOpacity=".4" strokeWidth="3" fill="none" />
        <path d="M22 13 H214" stroke="#fff" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Miniatura cuadrada: foto del ingrediente si el admin la subió; si no, un ícono neutro. */
export function IngredientThumb({ name, image, size = 48, className = '' }: { name: string; image?: string; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (image) {
    return <img src={image} alt={name} style={style} className={`rounded-xl object-cover shrink-0 border border-gray-200 dark:border-stone-700 ${className}`} />;
  }
  return (
    <div style={style} className={`rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0 ${className}`}>
      <ChefHat className="w-1/2 h-1/2" />
    </div>
  );
}

/**
 * Miniatura de una hamburguesa armada en el Creador Interactivo: apila el
 * mismo arte SVG de sus ingredientes que usa el escenario del builder, en vez
 * de un icono generico. Un producto personalizado nunca tiene una sola foto
 * fija (cambia con cada pedido), pero SI sabemos exactamente que lleva, y eso
 * es mas fiel que cualquier placeholder.
 */
export function CustomBurgerThumb({ ingredientNames, size = 48, className = '' }: { ingredientNames: string[]; size?: number; className?: string }) {
  const kinds = (ingredientNames || []).map(n => artKind(n)).filter((k): k is ArtKind => !!k);
  const bunKind = kinds.find(k => (BUN_KINDS as ArtKind[]).includes(k)) as 'brioche' | 'pretzel' | undefined;
  const fillingKinds = kinds.filter(k => !(BUN_KINDS as ArtKind[]).includes(k));
  const style = { width: size, height: size };

  if (!bunKind && fillingKinds.length === 0) {
    return (
      <div style={style} className={`rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0 ${className}`}>
        <ChefHat className="w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <div style={style} className={`rounded-xl bg-gray-50 dark:bg-stone-800 border border-gray-100 dark:border-stone-800 overflow-hidden shrink-0 relative ${className}`}>
      <div
        className="absolute left-1/2 top-1/2 flex flex-col items-center"
        style={{ transform: `translate(-50%, -50%) scale(${size / 312})`, transformOrigin: 'center center' }}
      >
        {bunKind && renderBunTop(bunKind)}
        {fillingKinds.map((k, idx) => renderArtLayer(k, idx))}
        {bunKind && renderBunBottom(bunKind)}
      </div>
    </div>
  );
}
