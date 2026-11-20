import { Gift } from 'lucide-react';

interface SeasonalSantaTrackProps {
  couponActive: boolean;
  onActivateGift: () => void;
}

export function SeasonalSantaTrack({ couponActive, onActivateGift }: SeasonalSantaTrackProps) {
  return (
    <button
      type="button"
      className="santa-runway-banner"
      aria-label="Expresso de Natal Brasil Tech — Resgatar cupom NATAL50 de R$ 50 OFF"
      onClick={onActivateGift}
    >
      {/* Fundo com estrelas suaves e pinheiros estilizados */}
      <svg
        className="santa-skyline-bg"
        viewBox="0 0 1200 64"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pineShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B3B2B" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0E1016" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        {/* Estrelas sutis */}
        <circle cx="95" cy="14" r="1.3" fill="#CFB06F" opacity="0.65" />
        <circle cx="235" cy="22" r="1.1" fill="#FAF7F2" opacity="0.45" />
        <circle cx="410" cy="12" r="1.5" fill="#CFB06F" opacity="0.7" />
        <circle cx="585" cy="19" r="1.1" fill="#FAF7F2" opacity="0.5" />
        <circle cx="760" cy="13" r="1.4" fill="#CFB06F" opacity="0.75" />
        <circle cx="940" cy="21" r="1.2" fill="#FAF7F2" opacity="0.5" />
        <circle cx="1110" cy="15" r="1.5" fill="#CFB06F" opacity="0.7" />
        {/* Pequenas silhuetas de pinheiros na base */}
        <path
          d="M0 64 L28 45 L46 64 L78 40 L98 64 L190 64 L214 44 L236 64 L480 64 L504 42 L526 64 L820 64 L842 46 L864 64 L1090 64 L1116 41 L1144 64 L1200 64 Z"
          fill="url(#pineShade)"
        />
      </svg>

      {/* Papai Noel correndo + Rena + Trenó Expresso */}
      <div className="santa-express-runner" aria-hidden="true">
        <svg width="248" height="48" viewBox="0 0 248 48" fill="none">
          {/* Rastro dourado de velocidade */}
          <line
            x1="4"
            y1="30"
            x2="34"
            y2="30"
            stroke="#CFB06F"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="5 4"
            opacity="0.7"
          />
          <line
            x1="12"
            y1="37"
            x2="42"
            y2="37"
            stroke="#DFC387"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeDasharray="4 4"
            opacity="0.55"
          />

          {/* Trenó compacto com presentes atrás do Noel */}
          <g className="santa-sleigh-group">
            {/* Caixa presente 1 (Ouro) */}
            <rect x="38" y="16" width="14" height="13" rx="2" fill="#CFB06F" />
            <rect x="44" y="16" width="2.4" height="13" fill="#9E1C28" />
            <rect x="38" y="21.5" width="14" height="2.2" fill="#9E1C28" />
            {/* Caixa presente 2 (Verde Natal) */}
            <rect x="54" y="19" width="12" height="10" rx="2" fill="#166534" />
            <rect x="59" y="19" width="2" height="10" fill="#CFB06F" />
            {/* Caixa presente 3 (Console / Carmim) */}
            <rect x="47" y="9" width="11" height="9" rx="1.8" fill="#9E1C28" />
            <rect x="51.5" y="9" width="2" height="9" fill="#FAF7F2" />

            {/* Corpo do Trenó */}
            <path
              d="M34 28 H72 C75 28 77 32 74 35 H37 C34 35 32 32 34 28 Z"
              fill="#7A121D"
              stroke="#CFB06F"
              strokeWidth="1.2"
            />
            {/* Patins do trenó */}
            <path
              d="M30 40 H78 C83 40 85 36 82 34"
              stroke="#CFB06F"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            <line x1="42" y1="35" x2="42" y2="40" stroke="#CFB06F" strokeWidth="1.6" />
            <line x1="65" y1="35" x2="65" y2="40" stroke="#CFB06F" strokeWidth="1.6" />
          </g>

          {/* Corda dourada conectando Noel e Rena */}
          <path
            d="M124 27 Q148 31 174 25"
            stroke="#CFB06F"
            strokeWidth="1.3"
            strokeDasharray="3 2"
            opacity="0.85"
          />

          {/* PAPAI NOEL CORRENDO ANIMADO */}
          <g className="santa-runner-body">
            {/* Saco de presentes nas costas */}
            <ellipse cx="97" cy="24" rx="8" ry="10" fill="#7A121D" stroke="#CFB06F" strokeWidth="1" />

            {/* Perna de trás (animada) */}
            <g className="santa-leg-back">
              <line
                x1="106"
                y1="30"
                x2="99"
                y2="41"
                stroke="#9E1C28"
                strokeWidth="4.2"
                strokeLinecap="round"
              />
              <ellipse cx="98" cy="42" rx="3.8" ry="2.2" fill="#14161B" />
            </g>

            {/* Perna da frente (animada) */}
            <g className="santa-leg-front">
              <line
                x1="110"
                y1="30"
                x2="118"
                y2="41"
                stroke="#B91C1C"
                strokeWidth="4.2"
                strokeLinecap="round"
              />
              <ellipse cx="120" cy="42" rx="4" ry="2.2" fill="#14161B" />
            </g>

            {/* Casaco vermelho + cinto dourado */}
            <path d="M100 18 C100 15 117 15 117 18 L119 31 H99 Z" fill="#B91C1C" />
            <rect x="99.5" y="25" width="19" height="3" rx="1" fill="#14161B" />
            <rect x="108" y="24.5" width="4" height="4" rx="0.8" fill="#CFB06F" />
            <rect x="99" y="29.5" width="20" height="2.4" rx="1.2" fill="#FAF7F2" />

            {/* Braço acenando / correndo */}
            <g className="santa-arm-wave">
              <line
                x1="114"
                y1="20"
                x2="124"
                y2="16"
                stroke="#B91C1C"
                strokeWidth="3.6"
                strokeLinecap="round"
              />
              <circle cx="125" cy="15.5" r="2.2" fill="#FAF7F2" />
            </g>

            {/* Cabeça, barba e gorro */}
            <circle cx="110" cy="13" r="5" fill="#F6D0B1" />
            {/* Barba branca */}
            <path d="M106 14 C108 21 115 21 116 14 Z" fill="#FAF7F2" />
            {/* Gorro vermelho + pom-pom */}
            <path d="M104 11 C106 4 114 5 116 11 Z" fill="#B91C1C" />
            <rect x="104" y="9.5" width="12" height="2.4" rx="1.2" fill="#FAF7F2" />
            <circle className="santa-pompom" cx="102" cy="8.5" r="2.3" fill="#FAF7F2" />
          </g>

          {/* RENA GALOPANDO NA FRENTE */}
          <g className="reindeer-gallop">
            {/* Pernas traseiras */}
            <g className="reindeer-legs-back">
              <line x1="176" y1="29" x2="169" y2="41" stroke="#A16236" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="180" y1="29" x2="177" y2="41" stroke="#854D27" strokeWidth="2.6" strokeLinecap="round" />
            </g>
            {/* Pernas dianteiras */}
            <g className="reindeer-legs-front">
              <line x1="196" y1="28" x2="206" y2="38" stroke="#A16236" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="193" y1="29" x2="199" y2="41" stroke="#854D27" strokeWidth="2.6" strokeLinecap="round" />
            </g>
            {/* Corpo da rena */}
            <ellipse cx="186" cy="25" rx="13" ry="6.2" fill="#A16236" />
            {/* Coleira dourada com sino */}
            <path d="M194 20 L199 26" stroke="#9E1C28" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="199.5" cy="26.5" r="1.8" fill="#CFB06F" />
            {/* Pescoço e cabeça */}
            <path d="M195 22 L203 14 L211 16 L209 21 L200 26 Z" fill="#B47143" />
            {/* Chifres dourados */}
            <path
              d="M203 14 L201 7 M201 10 L197 8 M206 14 L208 6 M207 9 L211 7"
              stroke="#CFB06F"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Nariz vermelho Rudolph */}
            <circle cx="212" cy="17.5" r="2.1" fill="#EF4444" />
            <circle cx="212" cy="17.5" r="4" fill="#EF4444" opacity="0.28" />
          </g>
        </svg>
      </div>

      {/* Camada de leitura frontal elegante (discreta à esquerda e botão interativo à direita) */}
      <div className="santa-runway-content">
        <span className="santa-runway-label">
          <strong>Expresso do Noel</strong>
          <span>Entregas saindo hoje para todo o Brasil</span>
        </span>
        <span className={`santa-runway-cta ${couponActive ? 'active' : ''}`}>
          <Gift size={14} strokeWidth={2.3} />
          <span>{couponActive ? 'NATAL50 ativo (R$ 50 OFF) ✓' : 'Resgatar R$ 50 OFF • NATAL50'}</span>
        </span>
      </div>
    </button>
  );
}
