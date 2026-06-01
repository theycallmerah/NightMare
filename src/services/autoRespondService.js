const autoResponds = new Map();

export function addAutoRespond(guildId, trigger, response) {
  if (!autoResponds.has(guildId)) autoResponds.set(guildId, new Map());
  autoResponds.get(guildId).set(trigger.toLowerCase(), response);
}

export function removeAutoRespond(guildId, trigger) {
  if (!autoResponds.has(guildId)) return false;
  return autoResponds.get(guildId).delete(trigger.toLowerCase());
}

export function getAutoResponds(guildId) {
  return autoResponds.get(guildId) || new Map();
}

export function checkAutoRespond(guildId, message) {
  if (!autoResponds.has(guildId)) return null;
  return autoResponds.get(guildId).get(message.toLowerCase()) || null;
}
