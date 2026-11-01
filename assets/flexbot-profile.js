// Shared, dependency-free contract for verified website channel owners.
export const WEBSITE_PROFILE_LIMITS = Object.freeze({ greetings: 10, personalGreetings: 10, commands: 10, message: 200, username: 100 });
export const WEBSITE_RESERVED_COMMANDS = Object.freeze([
  "!commands", "!uptime", "!hello", "!8ball", "!dice", "!enter", "!vote", "!song", "!songs",
  "!queue", "!weather", "!image", "!mage", "!pause", "!play", "!resume", "!stop", "!skip",
]);
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const DEFAULT_GREETING_ID = "00000000-0000-4000-8000-000000000101";
// Starter text is copied into each profile so owners can edit or remove it freely.
export const DEFAULT_DAILY_GREETINGS = Object.freeze([
  "Hey {user}, welcome in! Good to see you in chat 💙",
  "Hello {user}! Pull up a seat and enjoy the stream. 👋",
  "Welcome to {channel}, {user}! Hope your day is going well. ☀️",
  "Glad you could join us, {user}! Make yourself at home. 🏡",
  "Hey {user}! Thanks for spending a little of your day with us. ✨",
  "A warm welcome to you, {user}! Let's enjoy the stream together. 💛",
  "Hi {user}! Whether you're chatting or just watching, you're welcome here. 😊",
  "Welcome in, {user}! Here's to good conversation and a few laughs. 🎉",
  "Great to see you, {user}! Settle in and enjoy some time with {channel}. 🌟",
  "Hello and welcome, {user}! Thanks for being part of today's chat. 🙌",
]);
const usernameKey = value => value.normalize("NFKC").trim().replace(/^@/, "").trim().replace(/\s+/gu, " ").toLowerCase();

export const WEBSITE_LM_STYLES = Object.freeze({
  helpful: "Helpful answers", friendly: "Warm and friendly", encouraging: "Hype and encouragement",
  deadpan: "Dry and deadpan", playful: "Playful teasing", sarcastic: "Light sarcasm", sassy: "Sassy comebacks",
  sharp_sarcasm: "Sharp sarcasm", roast: "Roast", savage: "Savage roast", rude: "Rude and blunt",
  very_rude: "Very rude", mean: "Very rude and mean",
});

export function createDefaultWebsiteLm() {
  return { enabled: false, command: "!askflex", style: "helpful", instructions: "", userLevel: "everyone", cooldown: 30, usernameReplies: [] };
}

export function validateWebsiteLm(input, commands = []) {
  const exact = (value, keys) => {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length ||
        keys.some(key => !Object.hasOwn(value, key))) throw new Error("Invalid LM Studio preferences. Only channel reply settings can be changed here.");
  };
  const preferences = value => {
    if (typeof value.enabled !== "boolean") throw new Error("LM Studio replies must be on or off.");
    if (typeof value.style !== "string" || !Object.hasOwn(WEBSITE_LM_STYLES, value.style)) throw new Error("Choose an LM Studio reply style.");
    if (!Number.isInteger(value.cooldown) || value.cooldown < 10 || value.cooldown > 3600) throw new Error("LM Studio cooldown must be a whole number from 10 to 3600 seconds.");
    if (typeof value.instructions !== "string" || value.instructions.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.instructions)) throw new Error("LM Studio instructions must be 1000 characters or fewer, without control characters.");
    return { enabled: value.enabled, style: value.style, cooldown: value.cooldown, instructions: value.instructions.trim() };
  };
  exact(input, ["enabled", "command", "style", "instructions", "userLevel", "cooldown", "usernameReplies"]);
  const common = preferences(input);
  const command = typeof input.command === "string" ? input.command.trim().toLowerCase() : "";
  if (!/^![a-z0-9_-]{1,30}$/.test(command) || WEBSITE_RESERVED_COMMANDS.includes(command) || commands.some(row => row.name === command))
    throw new Error("Choose a unique LM Studio !command that is not a built-in or one of your custom commands.");
  if (!["everyone", "regular", "moderator", "owner"].includes(input.userLevel)) throw new Error("Choose who can use your LM Studio command.");
  if (!Array.isArray(input.usernameReplies) || input.usernameReplies.length > 20) throw new Error("Use up to 20 LM Studio username rules.");
  const names = new Set();
  const usernameReplies = input.usernameReplies.map(row => {
    exact(row, ["username", "enabled", "style", "cooldown", "instructions"]);
    if (typeof row.username !== "string" || row.username.length > 100 || /[\u0000-\u001f\u007f]/.test(row.username)) throw new Error("Enter a chat username of 1–100 characters.");
    const name = usernameKey(row.username);
    if (!name || names.has(name)) throw new Error("Use each LM Studio username only once.");
    names.add(name);
    return { username: row.username.trim(), ...preferences(row) };
  });
  return { ...common, command, userLevel: input.userLevel, usernameReplies };
}

export function createDefaultWebsiteProfile() {
  return { version: 2, greetingsEnabled: true, greetingMode: "random",
    greetings: DEFAULT_DAILY_GREETINGS.map((message, index) => ({
      id: `00000000-0000-4000-8000-${String(101 + index).padStart(12, "0")}`, message, enabled: true,
    })),
    selectedGreetingId: DEFAULT_GREETING_ID, personalGreetings: [], commands: [], lmStudio: createDefaultWebsiteLm() };
}

export function validateWebsiteProfile(input) {
  const object = (value, fields, label) => {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key)) ||
        Object.keys(value).some(key => !fields.includes(key))) throw new Error(`Invalid ${label} settings.`);
  };
  const text = (value, maximum, label) => {
    if (typeof value !== "string" || !value.trim() || [...value.trim()].length > maximum || /[\u0000-\u001f\u007f]/.test(value))
      throw new Error(`${label} must contain 1–${maximum} characters.`);
    return value.trim();
  };
  const flag = (value, label) => { if (typeof value !== "boolean") throw new Error(`${label} must be on or off.`); return value; };
  const ids = new Set();
  const id = value => {
    if (typeof value !== "string" || !UUID.test(value) || ids.has(value.toLowerCase())) throw new Error("Each saved greeting and command needs a unique valid ID.");
    ids.add(value.toLowerCase()); return value.toLowerCase();
  };
  object(input, ["version", "greetingsEnabled", "greetingMode", "greetings", "selectedGreetingId", "personalGreetings", "commands", ...(input?.version === 2 ? ["lmStudio"] : [])], "channel profile");
  if (![1, 2].includes(input.version) || !["fixed", "random"].includes(input.greetingMode)) throw new Error("Choose a fixed or random greeting style.");
  for (const key of ["greetings", "personalGreetings", "commands"])
    if (!Array.isArray(input[key]) || input[key].length > WEBSITE_PROFILE_LIMITS[key]) throw new Error(`Save up to 10 ${key === "personalGreetings" ? "personal greetings" : key}.`);
  const greetings = input.greetings.map(item => {
    object(item, ["id", "message", "enabled"], "greeting");
    return { id: id(item.id), message: text(item.message, 200, "Greeting"), enabled: flag(item.enabled, "Greeting") };
  });
  const names = new Set();
  const personalGreetings = input.personalGreetings.map(item => {
    object(item, ["id", "username", "message", "enabled"], "personal greeting");
    const username = text(item.username, 100, "Username"), key = usernameKey(username);
    if (!key || names.has(key)) throw new Error("Use each personal greeting username only once.");
    names.add(key);
    return { id: id(item.id), username, message: text(item.message, 200, "Personal greeting"), enabled: flag(item.enabled, "Personal greeting") };
  });
  const commandNames = new Set();
  const commands = input.commands.map(item => {
    object(item, ["id", "name", "response", "enabled", "cooldownSeconds"], "command");
    const name = typeof item.name === "string" ? item.name.trim().toLowerCase() : "";
    if (!/^![a-z0-9_-]{1,30}$/.test(name) || WEBSITE_RESERVED_COMMANDS.includes(name) || commandNames.has(name))
      throw new Error("Use unique custom command names: ! followed by 1–30 letters, numbers, _ or -. Built-in command names are reserved.");
    if (!Number.isInteger(item.cooldownSeconds) || item.cooldownSeconds < 0 || item.cooldownSeconds > 3600)
      throw new Error("Command cooldown must be a whole number from 0 to 3600 seconds.");
    commandNames.add(name);
    return { id: id(item.id), name, response: text(item.response, 200, "Command response"), enabled: flag(item.enabled, "Command"), cooldownSeconds: item.cooldownSeconds };
  });
  const selectedGreetingId = typeof input.selectedGreetingId === "string" ? input.selectedGreetingId.toLowerCase() : input.selectedGreetingId;
  if (selectedGreetingId !== null && !greetings.some(item => item.id === selectedGreetingId)) throw new Error("Choose one of your saved greetings.");
  const greetingsEnabled = flag(input.greetingsEnabled, "Greetings");
  if (greetingsEnabled && greetings.length &&
      (input.greetingMode === "fixed" ? !greetings.some(item => item.id === selectedGreetingId && item.enabled) : !greetings.some(item => item.enabled)))
    throw new Error("Enable and select a greeting, or turn general greetings off.");
  return { version: input.version, greetingsEnabled, greetingMode: input.greetingMode, greetings, selectedGreetingId, personalGreetings, commands,
    ...(input.version === 2 && { lmStudio: validateWebsiteLm(input.lmStudio, commands) }) };
}
