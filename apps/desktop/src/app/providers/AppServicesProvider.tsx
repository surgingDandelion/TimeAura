import { createContext, startTransition, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { AppContainer } from "@timeaura-core";

import { createDesktopAppServices } from "../bootstrap/createDesktopAppServices";

interface AppServicesContextValue {
  container: AppContainer | null;
  status: "loading" | "ready" | "error";
  error: Error | null;
}

const AppServicesContext = createContext<AppServicesContextValue>({
  container: null,
  status: "loading",
  error: null,
});

export function AppServicesProvider({ children }: { children: ReactNode }): JSX.Element {
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeContainer: AppContainer | null = null;

    void createDesktopAppServices()
      .then((nextContainer) => {
        if (cancelled) {
          void nextContainer.dispose?.();
          return;
        }

        activeContainer = nextContainer;
        startTransition(() => {
          setContainer(nextContainer);
          setStatus("ready");
        });
      })
      .catch((cause) => {
        if (cancelled) {
          return;
        }

        const nextError = cause instanceof Error ? cause : new Error("应用服务初始化失败");
        startTransition(() => {
          setError(nextError);
          setStatus("error");
        });
      });

    return () => {
      cancelled = true;
      void activeContainer?.dispose?.();
    };
  }, []);

  if (status === "loading") {
    return <div className="bootstrap-screen">正在初始化 TimeAura Desktop…</div>;
  }

  if (status === "error" || !container) {
    return (
      <div className="bootstrap-screen bootstrap-screen-error">
        <div className="bootstrap-title">应用初始化失败</div>
        <div className="bootstrap-detail">{error?.message ?? "未知错误"}</div>
      </div>
    );
  }

  return (
    <AppServicesContext.Provider
      value={{
        container,
        status,
        error,
      }}
    >
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices(): AppContainer {
  const context = useContext(AppServicesContext);

  if (!context.container) {
    throw new Error("AppServicesProvider is not ready");
  }

  return context.container;
}
