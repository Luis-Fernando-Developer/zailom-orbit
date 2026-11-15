import type { SocialPlatform } from "@prisma/client";

export type IntegrationState = "CONNECTED" | "AVAILABLE" | "COMING_SOON";

export interface SocialProviderDefinition {
  platform: SocialPlatform;
  name: string;
  provider: string;
  authentication: "META_OAUTH" | "OAUTH_2" | "OAUTH_2_PKCE" | "NONE";
  plannedFormats: string[];
  capabilities: {
    connect: boolean;
    publish: boolean;
    scheduling: boolean;
    analytics: boolean;
    inbox: boolean;
  };
}

export interface SocialProviderCatalogItem extends SocialProviderDefinition {
  state: IntegrationState;
}

export interface ProviderConnection {
  connected: boolean;
  externalAccountId?: string;
  displayName?: string;
}

export interface SocialPublishInput {
  workspaceId: string;
  postId: string;
}

export interface SocialPublishResult {
  externalMediaId: string;
  permalink?: string | null;
}

/**
 * Runtime contract every concrete network adapter must implement.
 * Credentials stay server-side; adapters receive workspace-scoped identifiers,
 * never browser-supplied access tokens.
 */
export interface SocialProviderAdapter {
  readonly definition: SocialProviderDefinition;
  getConnection(workspaceId: string): Promise<ProviderConnection>;
  createAuthorizationUrl(context: {
    userId: string;
    workspaceId: string;
    redirectUri: string;
  }): Promise<string>;
  disconnect(workspaceId: string): Promise<void>;
  publish(input: SocialPublishInput): Promise<SocialPublishResult>;
}

/**
 * Central registry for social providers.
 *
 * Keep provider-specific OAuth, token storage and publishing implementations
 * behind this contract as each network is integrated. The registry describes
 * product capabilities; it does not claim that an unimplemented API is live.
 */
export const socialProviderRegistry: Record<SocialPlatform, SocialProviderDefinition> = {
  INSTAGRAM: {
    platform: "INSTAGRAM",
    name: "Instagram",
    provider: "Meta",
    authentication: "META_OAUTH",
    plannedFormats: ["POST", "REEL", "CAROUSEL"],
    capabilities: { connect: true, publish: true, scheduling: true, analytics: false, inbox: false },
  },
  FACEBOOK: {
    platform: "FACEBOOK",
    name: "Facebook",
    provider: "Meta",
    authentication: "META_OAUTH",
    plannedFormats: ["POST (texto)"],
    capabilities: { connect: true, publish: true, scheduling: false, analytics: false, inbox: false },
  },
  TIKTOK: {
    platform: "TIKTOK",
    name: "TikTok",
    provider: "TikTok",
    authentication: "OAUTH_2",
    plannedFormats: ["POST", "VIDEO", "CAROUSEL"],
    capabilities: { connect: false, publish: false, scheduling: false, analytics: false, inbox: false },
  },
  YOUTUBE: {
    platform: "YOUTUBE",
    name: "YouTube",
    provider: "Google",
    authentication: "OAUTH_2",
    plannedFormats: ["VIDEO", "SHORT"],
    capabilities: { connect: false, publish: false, scheduling: false, analytics: false, inbox: false },
  },
  LINKEDIN: {
    platform: "LINKEDIN",
    name: "LinkedIn",
    provider: "LinkedIn",
    authentication: "OAUTH_2_PKCE",
    plannedFormats: ["POST", "VIDEO", "CAROUSEL"],
    capabilities: { connect: false, publish: false, scheduling: false, analytics: false, inbox: false },
  },
  OTHER: {
    platform: "OTHER",
    name: "Outra rede",
    provider: "Custom",
    authentication: "NONE",
    plannedFormats: ["POST"],
    capabilities: { connect: false, publish: false, scheduling: false, analytics: false, inbox: false },
  },
};

export function getSocialProviderCatalog(
  connectedPlatforms: ReadonlySet<SocialPlatform>,
): SocialProviderCatalogItem[] {
  return Object.values(socialProviderRegistry).map((provider) => ({
    ...provider,
    state: connectedPlatforms.has(provider.platform)
      ? "CONNECTED"
      : provider.capabilities.connect
        ? "AVAILABLE"
        : "COMING_SOON",
  }));
}
