import Image from "next/image";

type LivruspLogoProps = {
  alt?: string;
  className?: string;
};

export function LivruspLogo({ alt = "LivrUSP", className }: LivruspLogoProps) {
  return (
    <Image
      alt={alt}
      className={className}
      height={243}
      src="/livrusp-logo.svg"
      unoptimized
      width={1103}
    />
  );
}

export function LivruspHeaderLogo() {
  return <LivruspLogo className="block h-10 w-auto sm:h-12" />;
}

export function LivruspFooterLogo() {
  return <LivruspLogo className="block h-12 w-auto sm:h-16" />;
}
