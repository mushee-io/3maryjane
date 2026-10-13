const videoUrl = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4";

const links = [
  { label: "clearinghouse", href: "/app" },
  { label: "hashed", href: "/app?product=hashed" },
  { label: "github", href: "https://github.com/mushee-io/3maryjane" },
  { label: "docs", href: "https://github.com/mushee-io/3maryjane#readme" },
];

export default function Homepage() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black" aria-label="3maryjane homepage">
      <video
        className="absolute inset-0 w-full h-full object-cover grayscale"
        autoPlay loop muted playsInline preload="auto"
        src={videoUrl} aria-hidden="true" tabIndex={-1}
      />
      <div className="absolute z-20 px-6 md:px-10 pt-6 top-0 left-0 right-0">
        <nav className="flex items-center justify-between gap-4" aria-label="main navigation">
          <a href="/home.html" className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur rounded-full pl-4 pr-6 py-3" aria-label="3maryjane home">
            <svg viewBox="0 0 256 256" className="h-5 w-5" aria-hidden="true">
              <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" fill="#ffffff" />
            </svg>
            <span className="text-white text-sm font-normal tracking-tight">3maryjane</span>
          </a>
          <div className="hidden md:flex items-center gap-1 bg-neutral-900/90 backdrop-blur rounded-full px-3 py-2">
            {links.map(({ label, href }) => (
              <a key={label} href={href} className="text-neutral-300 hover:text-white transition-colors text-sm px-5 py-2 rounded-full">{label}</a>
            ))}
          </div>
          <a href="/app" className="bg-white text-black text-sm font-normal rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors whitespace-nowrap">get started</a>
        </nav>
      </div>
      <div className="relative h-full w-full">
        <h1 aria-label="clear your capital" className="hero-title text-white font-medium">
          <span className="absolute text-[14vw] md:text-[13vw] left-4 md:left-10 top-[18%]">clear</span>
          <span className="absolute text-[14vw] md:text-[13vw] right-4 md:right-10 top-[38%]">your</span>
          <span className="absolute text-[14vw] md:text-[13vw] left-[18%] md:left-[28%] top-[58%]">capital</span>
        </h1>
        <p className="absolute left-6 md:left-10 top-[46%] max-w-[190px] md:max-w-[240px] text-[15px] leading-snug text-white/90">
          one account. every market. one risk layer. your capital stays yours on monad.
        </p>
        <div className="absolute right-6 md:right-24 top-[14%]">
          <div className="flex items-center gap-3 justify-end">
            <span className="hidden md:block h-px w-24 bg-white/40 rotate-[20deg]" aria-hidden="true" />
            <span className="text-4xl md:text-5xl font-medium tracking-tight">1</span>
          </div>
          <p className="text-xs md:text-sm text-white/70 mt-1 text-right">user-owned account</p>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />
        <div className="absolute left-6 md:left-20 bottom-20 md:bottom-24">
          <div className="flex items-center gap-3">
            <span className="text-4xl md:text-5xl font-medium tracking-tight">3</span>
            <span className="hidden md:block h-px w-24 bg-white/40 rotate-[-20deg]" aria-hidden="true" />
          </div>
          <p className="text-xs md:text-sm text-white/70 mt-1">portfolio risk sources</p>
        </div>
        <div className="absolute right-6 md:right-20 bottom-16 md:bottom-20">
          <div className="flex items-center gap-3 justify-end">
            <span className="hidden md:block h-px w-24 bg-white/40 rotate-[-20deg]" aria-hidden="true" />
            <span className="text-4xl md:text-5xl font-medium tracking-tight">10143</span>
          </div>
          <p className="text-xs md:text-sm text-white/70 mt-1 text-right">monad testnet</p>
        </div>
      </div>
    </section>
  );
}
