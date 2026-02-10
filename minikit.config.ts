const ROOT_URL =
  process.env.NODE_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header:
      "eyJmaWQiOjIzNzk2NzMsInR5cGUiOiJhdXRoIiwia2V5IjoiMHhCM0M5OEU5RWY0M2Y3ODJEZWIwOTVjMGM1NTcyRjZCNjQ4QzZENDExIn0",
    payload: "eyJkb21haW4iOiJiYXNlbWluaWFwcC10ZXN0LnZlcmNlbC5hcHAifQ",
    signature:
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEEvx_2fBRnwV7sO_jYN39zB4E93x4ykU8cFiaAxoWn6zmBxJRhsCM3LF7y4fl5dIx4RfVE2sRwDIBEvUh5e0KYmHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  },
  miniapp: {
    version: "1",
    name: "Brushie's",
    subtitle: "A drawing art mini-app on Base",
    description:
      "Adsorb the power of web3 with Brushie's, a drawing art mini-app on Base. Create and share your art, and mint it as NFTs to showcase your creativity on the blockchain. Join the waitlist now to unleash your artistic potential with Brushie's!",
    screenshotUrls: [`${ROOT_URL}/brushies-portrait.png`],
    iconUrl: `${ROOT_URL}/brushies.jpg`,
    splashImageUrl: `${ROOT_URL}/brushies.jpg`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["marketing", "ads", "quickstart", "waitlist"],
    heroImageUrl: `${ROOT_URL}/brushies.jpg`,
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/brushies.jpg`,
  },
} as const;
