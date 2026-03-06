import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/lib/api_vmt";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
};

export type OrgMemberRole = 'owner' | 'admin' | 'member';

export type User = {
  id: string;
  email: string;
  username: string;
  role: string;
};

export type Session = {
  access_token: string;
  user: User;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  demoLogin: () => Promise<void>;
  organization: Organization | null;
  role: OrgMemberRole | null;
};

const DEMO_SESSION_KEY = "vajrascan_demo_session";
const TOKEN_KEY = "vmt_token";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrgMemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check Demo Session
      const storedDemo = localStorage.getItem(DEMO_SESSION_KEY);
      if (storedDemo === "true") {
        await demoLogin();
        return;
      }

      // 2. Check Real Local JWT Session
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          setSession({ access_token: token, user: userData });
          // Assign a default local organization since we bypassed Supabase
          setOrganization({
            id: "local-org-id",
            name: "Local Organization",
            slug: "local-org",
            subscription_tier: "enterprise"
          });
          setRole(userData.role as OrgMemberRole || "admin");
        } catch (err) {
          console.error("Failed to restore session:", err);
          localStorage.removeItem(TOKEN_KEY);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    if (res.error) throw new Error(res.error);

    localStorage.setItem(TOKEN_KEY, res.token);
    setSession({ access_token: res.token, user: res.user });
    setUser(res.user);
    setOrganization({
      id: "local-org-id",
      name: "Local Organization",
      slug: "local-org",
      subscription_tier: "enterprise"
    });
    setRole(res.user.role as OrgMemberRole || "admin");
  };

  const signUp = async (email: string, password: string, username: string) => {
    const res = await authApi.register({ email, password, username });
    if (res.error) throw new Error(res.error);

    if (res.token) {
      localStorage.setItem(TOKEN_KEY, res.token);
      setSession({ access_token: res.token, user: res.user });
      setUser(res.user);
      setOrganization({
        id: "local-org-id",
        name: "Local Organization",
        slug: "local-org",
        subscription_tier: "enterprise"
      });
      setRole(res.user.role as OrgMemberRole || "admin");
    }
  };

  const signOut = async () => {
    localStorage.removeItem(DEMO_SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setSession(null);
    setUser(null);
    setOrganization(null);
    setRole(null);
  };

  const demoLogin = async () => {
    localStorage.setItem(DEMO_SESSION_KEY, "true");
    localStorage.setItem(TOKEN_KEY, "mock-token");
    const mockUser: User = {
      id: "demo-user-id",
      email: "demo@vajrascan.com",
      username: "DemoAdmin",
      role: "admin"
    };

    const mockSession: Session = {
      access_token: "mock-token",
      user: mockUser,
    };

    setSession(mockSession);
    setUser(mockUser);
    setOrganization({
      id: "demo-org-id",
      name: "Demo Organization",
      slug: "demo-org",
      subscription_tier: "enterprise"
    });
    setRole("owner");
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut, demoLogin, organization, role }}>
      {children}
    </AuthContext.Provider>
  );
};
