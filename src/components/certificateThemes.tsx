import React from 'react';

export type CertificateLayout = 'prestige' | 'tech' | 'modern';

export type CertificatePattern =
  | 'neural'
  | 'aurora'
  | 'matrix'
  | 'circuit'
  | 'gold-ornate'
  | 'azure-grid'
  | 'spectrum'
  | 'paper';

export interface CertificateTheme {
  /** Structural design family used to render the sheet. */
  layout: CertificateLayout;
  /** CSS background value for the certificate sheet. */
  surface: string;
  /** Inner panel background (translucent). */
  panel: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  accent: string;
  accent2: string;
  accentSoft: string;
  pattern: CertificatePattern;
  patternOpacity: number;
  headingClass: string;
  nameClass: string;
  bodyClass: string;
  scriptClass: string;
  isDark: boolean;
  /** Small caps label used as the theme designation on the sheet. */
  designation: string;
}

const THEMES: Record<string, CertificateTheme> = {
  // ---------------------------------------------------------------- NEW: AI FAMILY
  ai_neural_network: {
    layout: 'tech',
    surface: 'linear-gradient(135deg, #060a1b 0%, #0d1330 48%, #090f22 100%)',
    panel: 'rgba(16, 24, 56, 0.55)',
    ink: '#f1f5ff',
    inkSoft: '#c2cbea',
    inkFaint: '#8f9ac7',
    line: 'rgba(148, 163, 255, 0.3)',
    accent: '#8ab4ff',
    accent2: '#a78bfa',
    accentSoft: 'rgba(138, 180, 255, 0.14)',
    pattern: 'neural',
    patternOpacity: 0.55,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: true,
    designation: 'Artificial Intelligence & Neural Systems',
  },
  ai_quantum_aurora: {
    layout: 'tech',
    surface: 'linear-gradient(140deg, #07091d 0%, #120a2e 52%, #05060f 100%)',
    panel: 'rgba(24, 18, 58, 0.5)',
    ink: '#f4f1ff',
    inkSoft: '#c9c2ec',
    inkFaint: '#9a92c4',
    line: 'rgba(167, 139, 250, 0.32)',
    accent: '#22d3ee',
    accent2: '#c084fc',
    accentSoft: 'rgba(34, 211, 238, 0.14)',
    pattern: 'aurora',
    patternOpacity: 0.85,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: true,
    designation: 'Quantum Computing & Generative AI',
  },
  ai_terminal_matrix: {
    layout: 'tech',
    surface: 'linear-gradient(160deg, #04070a 0%, #06110e 55%, #030608 100%)',
    panel: 'rgba(8, 24, 20, 0.55)',
    ink: '#ecfdf5',
    inkSoft: '#b7e7d4',
    inkFaint: '#7fbfa6',
    line: 'rgba(52, 211, 153, 0.28)',
    accent: '#34d399',
    accent2: '#22d3ee',
    accentSoft: 'rgba(52, 211, 153, 0.13)',
    pattern: 'matrix',
    patternOpacity: 0.4,
    headingClass: 'font-mono',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: true,
    designation: 'Machine Learning Engineering & MLOps',
  },
  ai_ml_royal_gold: {
    layout: 'prestige',
    surface: 'linear-gradient(180deg, #fffdf6 0%, #fdf7e8 100%)',
    panel: 'rgba(255, 255, 255, 0.72)',
    ink: '#1c1a10',
    inkSoft: '#5b5340',
    inkFaint: '#8b8168',
    line: 'rgba(184, 145, 47, 0.45)',
    accent: '#b8912f',
    accent2: '#7c5e12',
    accentSoft: 'rgba(184, 145, 47, 0.12)',
    pattern: 'gold-ornate',
    patternOpacity: 1,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: false,
    designation: 'Artificial Intelligence & Machine Learning',
  },
  ai_cloud_azure: {
    layout: 'modern',
    surface: 'linear-gradient(180deg, #ffffff 0%, #f3f9ff 100%)',
    panel: 'rgba(255, 255, 255, 0.8)',
    ink: '#0b2545',
    inkSoft: '#41597a',
    inkFaint: '#7a8fa8',
    line: 'rgba(14, 116, 182, 0.22)',
    accent: '#0ea5e9',
    accent2: '#0369a1',
    accentSoft: 'rgba(14, 165, 233, 0.1)',
    pattern: 'azure-grid',
    patternOpacity: 0.55,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: false,
    designation: 'AI Cloud Architecture & Data Engineering',
  },
  ai_vision_spectrum: {
    layout: 'modern',
    surface: 'linear-gradient(180deg, #ffffff 0%, #fdf7fb 100%)',
    panel: 'rgba(255, 255, 255, 0.82)',
    ink: '#191322',
    inkSoft: '#544a63',
    inkFaint: '#8c8299',
    line: 'rgba(214, 33, 155, 0.2)',
    accent: '#d6219b',
    accent2: '#06b6d4',
    accentSoft: 'rgba(214, 33, 155, 0.1)',
    pattern: 'spectrum',
    patternOpacity: 0.9,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: false,
    designation: 'Computer Vision & Intelligent Systems',
  },

  // ---------------------------------------------------------------- EXISTING FAMILY
  web_development: {
    layout: 'tech',
    surface: 'linear-gradient(150deg, #040907 0%, #07130f 55%, #03080a 100%)',
    panel: 'rgba(6, 20, 16, 0.6)',
    ink: '#ecfdf5',
    inkSoft: '#b9e6d3',
    inkFaint: '#7fbfa6',
    line: 'rgba(16, 185, 129, 0.28)',
    accent: '#10b981',
    accent2: '#22d3ee',
    accentSoft: 'rgba(16, 185, 129, 0.13)',
    pattern: 'circuit',
    patternOpacity: 0.45,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: true,
    designation: 'Web Development & Software Engineering',
  },
  cyber_emerald: {
    layout: 'tech',
    surface: 'linear-gradient(150deg, #04100b 0%, #061c14 55%, #030a08 100%)',
    panel: 'rgba(6, 26, 20, 0.6)',
    ink: '#edfdf6',
    inkSoft: '#b6e8d6',
    inkFaint: '#78c0a7',
    line: 'rgba(16, 185, 129, 0.3)',
    accent: '#10b981',
    accent2: '#34d399',
    accentSoft: 'rgba(16, 185, 129, 0.14)',
    pattern: 'neural',
    patternOpacity: 0.4,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: true,
    designation: 'Cybersecurity & Certified Computing',
  },
  imperial_gold: {
    layout: 'prestige',
    surface: 'linear-gradient(180deg, #0c1013 0%, #10161a 60%, #0a0e11 100%)',
    panel: 'rgba(18, 24, 28, 0.6)',
    ink: '#f9f4e4',
    inkSoft: '#d9cfae',
    inkFaint: '#a89f83',
    line: 'rgba(212, 175, 55, 0.42)',
    accent: '#d4af37',
    accent2: '#f0d67a',
    accentSoft: 'rgba(212, 175, 55, 0.12)',
    pattern: 'gold-ornate',
    patternOpacity: 1,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: true,
    designation: 'Professional Competence & Excellence',
  },
  modern_minimal: {
    layout: 'modern',
    surface: 'linear-gradient(180deg, #ffffff 0%, #f7faf9 100%)',
    panel: 'rgba(255, 255, 255, 0.85)',
    ink: '#07110d',
    inkSoft: '#3f5148',
    inkFaint: '#7c8b83',
    line: 'rgba(6, 95, 70, 0.2)',
    accent: '#059669',
    accent2: '#10b981',
    accentSoft: 'rgba(5, 150, 105, 0.1)',
    pattern: 'azure-grid',
    patternOpacity: 0.4,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: false,
    designation: 'Modern Professional Certification',
  },
  academic_classic: {
    layout: 'prestige',
    surface: 'linear-gradient(180deg, #fffdf8 0%, #fbf6ec 100%)',
    panel: 'rgba(255, 255, 255, 0.75)',
    ink: '#152238',
    inkSoft: '#4a5870',
    inkFaint: '#8792a5',
    line: 'rgba(30, 58, 138, 0.25)',
    accent: '#1e3a8a',
    accent2: '#b8912f',
    accentSoft: 'rgba(30, 58, 138, 0.08)',
    pattern: 'paper',
    patternOpacity: 0.7,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: false,
    designation: 'Academic Excellence & Distinction',
  },
  sovereign_navy: {
    layout: 'prestige',
    surface: 'linear-gradient(180deg, #ffffff 0%, #f5f8ff 100%)',
    panel: 'rgba(255, 255, 255, 0.8)',
    ink: '#0b1b3a',
    inkSoft: '#42506c',
    inkFaint: '#8390a6',
    line: 'rgba(30, 58, 138, 0.22)',
    accent: '#1e3a8a',
    accent2: '#0ea5e9',
    accentSoft: 'rgba(30, 58, 138, 0.08)',
    pattern: 'paper',
    patternOpacity: 0.65,
    headingClass: 'font-cinzel',
    nameClass: 'font-playfair',
    bodyClass: 'font-sans',
    scriptClass: 'font-signature',
    isDark: false,
    designation: 'Institutional Merit & Achievement',
  },
};

const FALLBACK: CertificateTheme = THEMES.modern_minimal;

export function getCertificateTheme(themeStyle?: string): CertificateTheme {
  return (themeStyle && THEMES[themeStyle]) || FALLBACK;
}

/**
 * Decorative backdrop drawn behind the certificate content. Pure CSS/SVG so it
 * rasterises identically in the browser, in PDF exports and in print.
 */
export const CertificatePatternLayer: React.FC<{
  theme: CertificateTheme;
  className?: string;
}> = ({ theme, className = '' }) => {
  const { pattern, accent, accent2, patternOpacity: o } = theme;

  if (pattern === 'neural' || pattern === 'circuit') {
    const isNeural = pattern === 'neural';
    return (
      <svg
        className={`absolute inset-0 h-full w-full pointer-events-none ${className}`}
        viewBox="0 0 1123 794"
        preserveAspectRatio="none"
        style={{ opacity: o }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="cert-glow" cx="50%" cy="18%" r="70%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1123" height="794" fill="url(#cert-glow)" />
        {isNeural ? (
          <g stroke={accent} strokeWidth="1" fill="none" opacity="0.35">
            <path d="M120 170 L320 260 L250 430 L470 500 L640 380 L860 470 L1000 300" />
            <path d="M120 170 L250 430 M320 260 L470 500 M320 260 L640 380 M860 470 L640 380 M640 380 L700 180" />
            <path d="M700 180 L860 470 M700 180 L470 500 M1000 300 L860 470" />
          </g>
        ) : (
          <g stroke={accent} strokeWidth="1.2" fill="none" opacity="0.3">
            <path d="M0 210 H240 V120 H430 M240 210 V330 H520 V470 H760" />
            <path d="M1123 620 H900 V720 H640 M900 620 V470 H700" />
            <path d="M80 640 H300 V700 H520" />
          </g>
        )}
        <g fill={accent2} opacity="0.5">
          {isNeural
            ? [[120, 170], [320, 260], [250, 430], [470, 500], [640, 380], [860, 470], [1000, 300], [700, 180]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4.5 : 3} />
              ))
            : [[240, 210], [430, 120], [520, 470], [760, 470], [900, 620], [640, 720], [80, 640], [520, 700]].map(([x, y], i) => (
                <rect key={i} x={x - 3} y={y - 3} width="6" height="6" rx="1" />
              ))}
        </g>
      </svg>
    );
  }

  if (pattern === 'aurora') {
    return (
      <div
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{
          opacity: o,
          backgroundImage: `radial-gradient(58% 48% at 16% 8%, ${accent}38 0%, transparent 62%),
            radial-gradient(52% 44% at 88% 14%, ${accent2}42 0%, transparent 66%),
            radial-gradient(60% 46% at 52% 104%, ${accent2}26 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />
    );
  }

  if (pattern === 'matrix') {
    const columns = ['const train = () =>', 'model.fit(X, y)', 'epoch 128 / 128', 'loss 0.014 · acc 99.2%', 'tensor(4096, 4096)', 'async def infer():', 'attention(Q, K, V)', 'optimizer.step()'];
    return (
      <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ opacity: o }} aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
          }}
        />
        {columns.map((text, i) => (
          <div
            key={i}
            className="absolute font-mono whitespace-nowrap"
            style={{
              top: `${8 + ((i * 11) % 78)}%`,
              left: i % 2 === 0 ? `${3 + (i % 3) * 4}%` : undefined,
              right: i % 2 === 1 ? `${3 + (i % 4) * 3}%` : undefined,
              fontSize: 11,
              color: i % 2 === 0 ? accent : accent2,
              opacity: 0.55,
            }}
          >
            {text}
          </div>
        ))}
      </div>
    );
  }

  if (pattern === 'gold-ornate') {
    const corner = (
      <g stroke={accent} fill="none" strokeWidth="1.6">
        <path d="M30 96 C30 56 56 30 96 30" />
        <path d="M30 118 C30 66 66 30 118 30" opacity="0.6" />
        <path d="M44 74 C58 58 74 44 92 40" opacity="0.5" />
      </g>
    );
    return (
      <svg
        className={`absolute inset-0 h-full w-full pointer-events-none ${className}`}
        viewBox="0 0 1123 794"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect x="26" y="26" width="1071" height="742" fill="none" stroke={accent} strokeWidth="1" opacity="0.45" />
        <rect x="34" y="34" width="1055" height="726" fill="none" stroke={accent} strokeWidth="2.5" opacity="0.7" />
        <g opacity="0.75">
          {corner}
          <g transform="translate(1123,0) scale(-1,1)">{corner}</g>
          <g transform="translate(0,794) scale(1,-1)">{corner}</g>
          <g transform="translate(1123,794) scale(-1,-1)">{corner}</g>
        </g>
      </svg>
    );
  }

  if (pattern === 'spectrum') {
    return (
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} style={{ opacity: o }} aria-hidden="true">
        <div
          className="absolute left-0 top-0 h-full w-[6px]"
          style={{ backgroundImage: `linear-gradient(180deg, ${accent} 0%, ${accent2} 100%)` }}
        />
        <div
          className="absolute right-0 top-0 h-full w-[6px]"
          style={{ backgroundImage: `linear-gradient(180deg, ${accent2} 0%, ${accent} 100%)` }}
        />
        <div
          className="absolute inset-x-0 top-0 h-2"
          style={{ backgroundImage: `linear-gradient(90deg, ${accent} 0%, #8b5cf6 45%, ${accent2} 100%)` }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-2"
          style={{ backgroundImage: `linear-gradient(90deg, ${accent2} 0%, #8b5cf6 55%, ${accent} 100%)` }}
        />
        <div
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full"
          style={{ backgroundImage: `radial-gradient(circle, ${accent}22 0%, transparent 70%)` }}
        />
      </div>
    );
  }

  if (pattern === 'azure-grid') {
    return (
      <div
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{
          opacity: o,
          backgroundImage: `linear-gradient(${accent}1f 1px, transparent 1px), linear-gradient(90deg, ${accent}1f 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
        }}
        aria-hidden="true"
      />
    );
  }

  // paper
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        opacity: o,
        backgroundImage: `repeating-linear-gradient(135deg, ${accent}0d 0 1px, transparent 1px 9px),
          radial-gradient(70% 60% at 50% 0%, ${accent}14 0%, transparent 70%)`,
      }}
      aria-hidden="true"
    />
  );
};
