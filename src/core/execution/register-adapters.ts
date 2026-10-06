import { registerExecutionAdapter } from "./adapter-registry";
import { playwrightAdapter } from "./playwright-adapter";
registerExecutionAdapter(playwrightAdapter);
