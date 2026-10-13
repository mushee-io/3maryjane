import { useEffect, useRef, useState } from "react";
import { ChevronUp, ArrowUpRight, Layers } from "lucide-react";

type Product = "clearing" | "hashed";
type NavigationProps = {
  activeProduct: Product;
  setActiveProduct: (product: Product) => void;
  connectWallet: () => void;
  walletLabel: string;
  network: string;
};

export function AppNavigation({ activeProduct, setActiveProduct, connectWallet, walletLabel, network }: NavigationProps) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const drawer = dialog.current;
    if (!drawer) return;
    if (open && !drawer.open) drawer.showModal();
    if (!open && drawer.open) drawer.close();
  }, [open]);

  function closeMenu() {
    setOpen(false);
    menuButton.current?.focus();
  }
  function choose(product: Product) {
    setActiveProduct(product);
    closeMenu();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  return (
    <>
      <header className="app-nav">
        <a className="app-brand" href="/home.html">3maryjane<span> / monad</span></a>
        <nav className="app-tabs" aria-label="Product">
          <button type="button" aria-pressed={activeProduct === "clearing"} onClick={() => setActiveProduct("clearing")}>Clearinghouse</button>
          <button type="button" aria-pressed={activeProduct === "hashed"} onClick={() => setActiveProduct("hashed")}>Hashed</button>
        </nav>
        <div className="app-nav-actions">
          <span className="app-network"><i />{network}</span>
          <button className="app-wallet" type="button" onClick={connectWallet}>{walletLabel}</button>
          <button ref={menuButton} type="button" className="app-menu-button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>Menu <ChevronUp size={16} aria-hidden="true" /></button>
        </div>
      </header>
      <dialog ref={dialog} className="app-drawer" aria-label="Application menu" onCancel={closeMenu} onClose={() => setOpen(false)}>
        <div className="drawer-header"><a className="app-brand" href="/home.html">3maryjane</a><button className="app-menu-button" type="button" onClick={closeMenu}>Close <ChevronUp size={16} aria-hidden="true" /></button></div>
        <nav aria-label="Application">
          <button type="button" onClick={() => choose("clearing")}>Clearinghouse</button>
          <button type="button" onClick={() => choose("hashed")}>Hashed</button>
          <button type="button" onClick={() => { closeMenu(); connectWallet(); }}>{walletLabel}</button>
          <a href="/home.html">Homepage</a>
          <a href="https://github.com/mushee-io/3maryjane#readme">Documentation</a>
          <a href="https://github.com/mushee-io/3maryjane">GitHub</a>
        </nav>
        <p className="drawer-footer">© {new Date().getFullYear()} 3maryjane · Monad</p>
      </dialog>
    </>
  );
}

const clearingTopics = ["Portfolio risk", "Cross-protocol execution", "Exposure netting", "Owner-defined limits", "Non-custodial accounts"];
const hashedTopics = ["Equity collateral", "hUSD credit", "Portfolio health", "Adapter execution", "Monad testnet"];
const lines = Array.from({ length: 20 }, (_, i) => i);

export function ProductIntro({ product }: { product: Product }) {
  const hashed = product === "hashed";
  const topics = hashed ? hashedTopics : clearingTopics;
  return (
    <>
      <section className="app-intro" aria-labelledby={product + "-intro-title"}>
        <div className="intro-lines left" aria-hidden="true">{lines.map(i => <span key={i} style={{ width: 60 + i * 10, animationDelay: i * .25 + "s" }} />)}</div>
        <div className="intro-lines right" aria-hidden="true">{lines.map(i => <span key={i} style={{ width: 60 + i * 10, animationDelay: i * .25 + "s" }} />)}</div>
        <div className="intro-lines top" aria-hidden="true">{lines.map(i => <span key={i} style={{ height: 60 + i * 10, animationDelay: i * .25 + "s" }} />)}</div>
        <div className="intro-content">
          <div className="intro-ticker" aria-label={topics.join(", ")}><div className="intro-track" aria-hidden="true">{Array.from({ length: 4 }, (_, row) => <div className="intro-ticker-group" key={row}>{topics.map(topic => <span key={topic}>{topic}</span>)}</div>)}</div></div>
          <h1 id={product + "-intro-title"}>{hashed ? <>Lock equity.<br /><em>Borrow</em> liquidity.</> : <>Every market.<br /><em>One</em> risk layer.</>}</h1>
          <p className="intro-subtitle">{hashed ? "A stock-backed credit module for your portfolio. Lock demo equity, borrow hUSD and keep your exposure on Monad testnet." : "One user-owned account for your capital, positions and portfolio risk across Monad protocols. Your capital stays yours."}</p>
          <div className="intro-actions">
            <a className="intro-primary" href={hashed ? "#credit-console" : "#portfolio-console"}>{hashed ? "Open credit console" : "View portfolio"}<ArrowUpRight size={16} aria-hidden="true" /></a>
            <a className="intro-secondary" href={hashed ? "#unified-clearing" : "#account-console"}><span className="intro-avatar"><Layers size={20} aria-hidden="true" /></span><span><strong>{hashed ? "Unified clearing" : "Your clearing account"}</strong><small><i />{hashed ? "Explore the portfolio" : "Load or create an account"}</small></span></a>
          </div>
        </div>
        <div className="intro-blur" aria-hidden="true" />
      </section>
      <div className="app-venues"><p>{hashed ? "Equity-backed credit on Monad testnet" : "Protocols and risk sources in the clearing architecture"}</p><div className="venues-marquee"><div className="venues-track">{[0,1,2,3].map(row => <div className="venues-group" key={row} aria-hidden={row !== 0}>{(hashed ? ["Hashed", "hNVDA", "hAAPL", "hUSD", "3maryjane"] : ["Perpl", "Hashed", "Free collateral", "Kuru", "Euler"]).map(name => <span key={name}>{name}</span>)}</div>)}</div></div></div>
    </>
  );
}
