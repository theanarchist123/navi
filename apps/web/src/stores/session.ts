import { create } from "zustand";
import type { AuthSession, LoginRequest } from "@opshub/contracts";
import { configureAuthHandlers } from "../lib/api";
import { authApi } from "../services";
import { clearLastSite } from "./lastSite";
import { notify } from "./toast";

type Status = "unknown" | "authenticated" | "anonymous";

interface SessionState {
  status: Status;
  session: AuthSession | null;
  restore: () => Promise<void>;
  login: (body: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

let restoreRequest = 0;

export const useSession = create<SessionState>((set) => ({
  status: "unknown",
  session: null,
  async restore() {
    const request = ++restoreRequest;
    try {
      const session = await authApi.me();
      if (request === restoreRequest) set({ session, status: "authenticated" });
    } catch {
      // 401 simply means "not signed in"; other failures also leave the user at the login screen.
      if (request === restoreRequest) set({ session: null, status: "anonymous" });
    }
  },
  async login(body) {
    const session = await authApi.login(body);
    ++restoreRequest;
    set({ session, status: "authenticated" });
  },
  async logout() {
    ++restoreRequest;
    try {
      await authApi.logout();
    } finally {
      clearLastSite();
      set({ session: null, status: "anonymous" });
    }
  },
}));

// The HTTP layer refreshes expired sessions on its own; it reports back here.
configureAuthHandlers({
  onRefreshed: (session) => useSession.setState({ session, status: "authenticated" }),
  onAuthFailure: () => {
    if (useSession.getState().status === "authenticated") notify.info("Your session has ended. Please sign in again.");
    useSession.setState({ session: null, status: "anonymous" });
  },
});

/**
 * The website builder (templates, module library, deploy, access control) is for platform
 * administrators only. Every UI entry point checks this one hook; the API enforces it independently.
 */
export const useCanBuildWebsites = (): boolean => useSession((s) => s.status === "authenticated" && s.session?.user.isPlatformAdmin === true);
