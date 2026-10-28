import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.fakhrul.exptrack",
  appName: "EXPTRACK",
  webDir: "out",
  server: { errorPath: "unsupported.html" },
  android: { backgroundColor: "#FBF7EE", allowMixedContent: false, minWebViewVersion: 111 },
  plugins: {
    SystemBars: { insetsHandling: "native" },
    LocalNotifications: { smallIcon: "ic_stat_spending", iconColor: "#EA580C" },
  },
};
export default config;
