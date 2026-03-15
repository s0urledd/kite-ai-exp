"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <div
            {...(!mounted && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none" as const, userSelect: "none" as const },
            })}
          >
            {!connected ? (
              <button
                onClick={openConnectModal}
                className="bg-kite-gold text-[#09090B] px-4 py-2 rounded-[10px] font-semibold text-[13px] hover:bg-kite-gold-light hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(196,169,106,0.2)] transition-all"
              >
                Connect Wallet
              </button>
            ) : chain?.unsupported ? (
              <button
                onClick={openChainModal}
                className="bg-red-500 text-white px-4 py-2 rounded-[10px] font-semibold text-[13px] hover:bg-red-600 transition-all"
              >
                Wrong Network
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={openChainModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-kite-surface hover:bg-kite-surface-hover transition-all"
                >
                  {chain?.iconUrl && (
                    <img src={chain.iconUrl} alt="" className="w-4 h-4 rounded-full" />
                  )}
                  <span className="text-xs font-medium text-kite-text">{chain?.name}</span>
                </button>
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-kite-gold text-[#09090B] font-semibold text-[13px] hover:bg-kite-gold-light transition-all"
                >
                  {account.displayName}
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
