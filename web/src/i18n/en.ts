// English texts: one file per section in ./en/, merged here. Shared keys are in common.json.
import common from "./en/common.json";
import home from "./en/home.json";
import about from "./en/about.json";
import overview from "./en/overview.json";
import simulator from "./en/simulator.json";
import map from "./en/map.json";
import country from "./en/country.json";
import banks from "./en/banks.json";
import channels from "./en/channels.json";
import monitor from "./en/monitor.json";
import level from "./en/level.json";
import compare from "./en/compare.json";
import method from "./en/method.json";

export default {
  ...common,
  ...home,
  ...about,
  ...overview,
  ...simulator,
  ...map,
  ...country,
  ...banks,
  ...channels,
  ...monitor,
  ...level,
  ...compare,
  ...method,
} as Record<string, string>;
