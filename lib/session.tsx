import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "individual" | "organization" | "government";
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

type Account = {
  status: "active" | "suspended" | "banned";
  organizer_status:
    | "none"
    | "pending"
    | "approved"
    | "rejected"
    | "suspended"
    | "banned";
  is_admin: boolean;
};

type SessionContextValue = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  account: Account | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  user: null,
  profile: null,
  account: null,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionContextValue["user"]>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        setProfile(data.profile ?? null);
        setAccount(data.account ?? null);
      } else {
        setUser(null);
        setProfile(null);
        setAccount(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, profile, account, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
