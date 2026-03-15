# CLAUDE.md — KiteAI Explorer

## Proje Özeti
KiteAI blockchain (chain ID: 2366, Avalanche subnet) için özel blok explorer.
- **Backend**: Blockscout (headless — sadece indexer + API, UI yok)
- **Frontend**: Next.js 14.2 + Tailwind + Recharts + viem
- **RPC**: `https://rpc.gokite.ai` (varsayılan)
- **Blockscout API**: `/api/v2` endpointleri

## Mimari Kararlar

### Veri Kaynağı Stratejisi (Dual-Source)
- **Birincil**: Blockscout API v2 (`/stats`, `/stats/charts/transactions`, vs.)
- **Fallback**: Doğrudan JSON-RPC (`eth_getBlockByNumber`, `eth_gasPrice`)
- Blockscout çökerse veya veri eksikse RPC fallback devreye girer
- Her zaman Blockscout'u önce dene, başarısız olursa RPC kullan

### Wallet Entegrasyonu — DEVRE DIŞI
- RainbowKit/WalletConnect entegre edildi ama sonra **performans nedeniyle devre dışı bırakıldı**
- Derleme süresi çok uzuyordu, lazy-load bile yeterli olmadı
- Paketler package.json'da duruyor ama kullanılmıyor
- Tekrar aktif etme talebi gelmedikçe dokunma

### Chart Veri Doğruluğu
- Grafikler **tek blok değerleri değil, zaman pencerelerine gruplanmış** aggregated data göstermeli
- 1H: 12 pencere × ~150 blok, her pencerede sampling + tahmin
- 24H/1W: Blockscout `/stats/charts/transactions` kullan, yoksa windowed sampling fallback
- TPS hesaplaması: Tüm 25 blok kullan (5 değil)

## Kullanıcı Tercihleri (Tasarım)

### Genel Stil
- **Koyu tema** (dark mode only), MonadVision/Etherscan ilham
- **Görünür kenarlıklar yok** — `--kite-border: transparent` yapıldı, tüm sayfalardan border kaldırıldı
- Metin renkleri: parlak beyaz label/axis text
- Dekoratif ikonlar mute (parlak değil)
- Stat kartlarında tam sayılar göster (kısaltma yok)

### Navbar
- "Kite" yazısı navbar'dan kaldırıldı
- Stat card ikonları güncellendi

### Sayfa Tasarımları
- **Address sayfası**: Etherscan tarzı iki sütunlu layout, compact overview, token holdings her zaman görünür
- **Alt sayfalar**: MonadVision/Etherscan hybrid tasarım
- Dashboard: Monad-ilham stat kartları

## Teknik Notlar

### Build & Dev
- Dev: `next dev --turbo` (Turbopack aktif, Next.js 14.2'de `--turbo` flag kullan, `--turbopack` değil)
- Build: `next build`
- Lint: `next lint`
- Type check: `tsc --noEmit`

### Bilinen Sorunlar & Geçmiş Fixler
- Blockscout fetch'lerde `cache: "no-store"` kullanılmalı (caching sorun çıkarıyordu)
- `STATS__BLOCKSCOUT_API_URL` env değişkeni gerekli
- `next_page_params` null olabilir — her yerde fallback kontrol et
- BigInt literal ES target uyumluluğu — `parseInt()` kullan
- `allowedDevOrigins` Next.js config'e eklendi

### Dosya Yapısı
```
frontend/
  src/
    app/              # Next.js app router sayfaları
    components/       # UI bileşenleri (dashboard/, layout/, ui/)
    lib/
      api/            # blockscout.ts (API client), rpc.ts (JSON-RPC)
      config/         # chain.ts (chain tanımı, URL'ler)
      hooks/          # use-chain-data.ts, use-chart-data.ts
      types/          # api.ts (tüm API tipleri)
      utils/          # format.ts vb.
blockscout/           # Docker compose & Blockscout config
```

## Dil
Kullanıcı Türkçe konuşuyor. Yanıtları Türkçe ver.
