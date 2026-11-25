// Testi in italiano: un file per sezione in ./it/, uniti qui. Le chiavi comuni stanno in common.json.
import common from "./it/common.json";
import home from "./it/home.json";
import about from "./it/about.json";
import overview from "./it/overview.json";
import simulator from "./it/simulator.json";
import map from "./it/map.json";
import country from "./it/country.json";
import banks from "./it/banks.json";
import channels from "./it/channels.json";
import monitor from "./it/monitor.json";
import level from "./it/level.json";
import compare from "./it/compare.json";
import method from "./it/method.json";

export default { ...common, ...home, ...about, ...overview, ...simulator, ...map, ...country, ...banks, ...channels, ...monitor, ...level, ...compare, ...method } as Record<string, string>;
