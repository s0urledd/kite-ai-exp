import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { kiteMainnet } from "./chain";

// Get a free project ID from https://cloud.walletconnect.com
// Without a valid ID, WalletConnect-based wallets won't work but
// injected wallets (MetaMask extension, etc.) still function fine.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "21fef48091f12692cad574a6f7753643"; // public demo ID

export const wagmiConfig = getDefaultConfig({
  appName: "Kite AI Explorer",
  projectId,
  chains: [kiteMainnet],
  ssr: true,
});
