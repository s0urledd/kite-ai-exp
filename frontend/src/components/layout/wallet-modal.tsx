"use client";

const WALLETS = ["MetaMask", "WalletConnect", "Coinbase Wallet", "Rainbow", "Trust Wallet", "Rabby"];

export function WalletModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-kite-surface border border-kite-border rounded-2xl p-6 w-[380px] max-w-[90vw] animate-in slide-in-from-top-2 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-base">Connect Wallet</span>
          <button
            onClick={onClose}
            className="text-kite-text-muted hover:text-kite-text text-lg p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-[13px] text-kite-text-secondary mb-4">
          Select a wallet to connect to Kite AI Chain
        </p>

        {WALLETS.map((w) => (
          <button
            key={w}
            className="flex justify-between items-center w-full px-4 py-3 bg-transparent border border-kite-border rounded-xl text-kite-text mb-1.5 hover:bg-kite-bg hover:border-kite-gold/25 transition-all"
          >
            <span className="text-sm">{w}</span>
            <span className="text-xs text-kite-text-muted">→</span>
          </button>
        ))}

        <div className="mt-4 text-[11px] text-kite-text-muted text-center">
          Powered by RainbowKit · wagmi
        </div>
      </div>
    </div>
  );
}
