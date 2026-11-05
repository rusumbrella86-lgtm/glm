export const LM_COMMAND_LIMIT = 10;

export function normalizeLmCommands(value) {
  if (!Array.isArray(value) || !value.length || value.length > LM_COMMAND_LIMIT)
    throw new Error(`Add 1â€“${LM_COMMAND_LIMIT} LM Studio chat commands.`);
  const names = new Set();
  return value.map(value => {
    if (typeof value !== "string") throw new Error("Enter an LM Studio !command.");
    let name = value.trim().toLowerCase();
    if (!name.startsWith("!")) name = `!${name}`;
    if (!/^![a-z0-9_-]{1,30}$/.test(name)) throw new Error("Use ! followed by 1â€“30 letters, numbers, _ or - for each LM Studio command.");
    if (names.has(name)) throw new Error(`${name} is listed more than once. Use unique LM Studio commands.`);
    names.add(name);
    return name;
  });
}

// Older installations and website profiles store only the primary command.
export function lmCommands(settings) {
  if (!Array.isArray(settings?.commands)) return [settings?.command || "!askflex"];
  // Preserve legacy callers that change only the primary command in memory.
  return settings.command && settings.command !== settings.commands[0]
    ? [settings.command, ...settings.commands.slice(1)] : settings.commands;
}

export function channelLmCommands(value) {
  if (value === undefined || value === null) return null; // Inherit global commands.
  return normalizeLmCommands(value);
}
