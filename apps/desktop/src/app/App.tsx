import { AppShell } from "./AppShell";
import { AppServicesProvider } from "./providers/AppServicesProvider";

export function App(): JSX.Element {
  return (
    <AppServicesProvider>
      <AppShell />
    </AppServicesProvider>
  );
}
