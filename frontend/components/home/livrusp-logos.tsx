export function LivruspHeaderLogo() {
  return (
    <svg
      aria-label="LivrUSP"
      className="h-10 w-auto sm:h-12"
      fill="none"
      role="img"
      viewBox="0 0 320 76"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* L */}
      <g>
        <rect fill="#1E2E4F" height="60" rx="2" width="14" x="4" y="6" />
        <rect fill="#1E2E4F" height="14" rx="2" width="38" x="4" y="52" />
        <rect fill="#89ACE0" height="3" width="14" x="4" y="12" />
        <rect fill="#89ACE0" height="3" width="14" x="4" y="45" />
        <rect fill="#6488BE" height="30" width="3" x="9" y="16" />
        <rect fill="#6488BE" height="14" width="6" x="34" y="52" />
      </g>

      {/* i */}
      <g>
        <rect fill="#1E2E4F" height="44" rx="2" width="14" x="50" y="22" />
        <rect fill="#89ACE0" height="3" width="14" x="50" y="27" />
        <rect fill="#89ACE0" height="3" width="14" x="50" y="32" />
        <rect fill="#89ACE0" height="3" width="14" x="50" y="58" />
      </g>

      {/* v (two leaning books) */}
      <g transform="translate(72, 22) rotate(-14 7 22)">
        <rect fill="#1E2E4F" height="44" rx="2" width="14" x="0" y="0" />
        <rect fill="#89ACE0" height="3" width="14" x="0" y="6" />
        <rect fill="#89ACE0" height="3" width="14" x="0" y="36" />
      </g>
      <g transform="translate(93, 22) rotate(14 7 22)">
        <rect fill="#82A9E1" height="44" rx="2" width="14" x="0" y="0" />
        <rect fill="#D9E1F1" height="3" width="14" x="0" y="6" />
        <rect fill="#D9E1F1" height="3" width="14" x="0" y="36" />
      </g>

      {/* r */}
      <g>
        <path
          d="M118 22H132V28C135 23.5 140 21.5 146 21.5H150V35H144C136.5 35 132 39 132 46.5V66H118V22Z"
          fill="#1E2E4F"
        />
        <rect fill="#D9E1F1" height="3" width="14" x="118" y="55" />
        <rect fill="#D9E1F1" height="3" width="14" x="118" y="60" />
        <rect fill="#D9E1F1" height="13.5" width="3" x="142" y="21.5" />
      </g>

      {/* usp */}
      <text
        fill="#1E2E4F"
        fontFamily="var(--font-geist-sans), Arial, Helvetica, sans-serif"
        fontSize="65"
        fontWeight="800"
        letterSpacing="-3"
        x="153"
        y="66"
      >
        usp
      </text>
    </svg>
  );
}

export function LivruspFooterLogo() {
  return (
    <svg
      aria-label="LivrUSP"
      className="h-12 w-auto sm:h-16"
      fill="none"
      role="img"
      viewBox="0 0 320 76"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* L */}
      <g>
        <rect fill="#000000" height="60" rx="2" width="14" x="4" y="6" />
        <rect fill="#000000" height="14" rx="2" width="38" x="4" y="52" />
        <rect fill="#D9E1F1" height="3" width="14" x="4" y="13" />
        <rect fill="#D9E1F1" height="3" width="14" x="4" y="46" />
      </g>

      {/* i */}
      <g>
        <rect fill="#000000" height="44" rx="2" width="14" x="50" y="22" />
        <rect fill="#D9E1F1" height="3" width="14" x="50" y="30" />
      </g>

      {/* v */}
      <path
        d="M68 22H83L93 52L103 22H118L100 66H86L68 22Z"
        fill="#000000"
      />

      {/* r */}
      <path
        d="M122 22H136V28C139 23.5 144 21.5 150 21.5H153V35H147C139.5 35 136 39 136 46.5V66H122V22Z"
        fill="#000000"
      />

      {/* u, s, p */}
      <text
        fill="#000000"
        fontFamily="var(--font-geist-sans), Arial, Helvetica, sans-serif"
        fontSize="65"
        fontWeight="800"
        letterSpacing="-3"
        x="155"
        y="66"
      >
        usp
      </text>
    </svg>
  );
}

