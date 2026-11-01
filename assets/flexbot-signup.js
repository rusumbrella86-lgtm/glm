import { createDefaultWebsiteLm, validateWebsiteProfile, WEBSITE_LM_STYLES } from "./flexbot-profile.js?v=20261101-greetings";

const API = "https://flexbot-channel-signup.mrflex420.chatgpt.site";
const STORAGE_KEY = "glm.flexbot.signup.v1";
const ACCESS_KEY = "glm.flexbot.owner.v1";
const $ = (id) => document.getElementById(id);
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const CHANNEL = /^UC[\w-]{22}$/;
const RESERVED_COMMANDS = new Set(["!commands", "!uptime", "!hello", "!8ball", "!dice", "!enter", "!vote", "!song", "!songs", "!queue", "!weather", "!image", "!mage", "!pause", "!play", "!resume", "!stop", "!skip"]);
let challenge = null;
let enrollment = null;
let access = null;
let owner = null;
let draft = null;
let dirty = false;
let busy = false;
let profileBusy = false;
let entryMode = "signup";
let activeView = "entry";
let ownerGeneration = 0;

function message(kind, value = "") {
  const node = $(kind); node.textContent = value; node.hidden = !value;
}
function clearMessages() { message("error"); message("notice"); }
function clearOwnerMessages() { message("owner-error"); message("owner-notice"); }
function storageRead(store, key) { try { return JSON.parse(store.getItem(key) || "null"); } catch { return null; } }
function storageWrite(store, key, value) { try { if (value) store.setItem(key, JSON.stringify(value)); else store.removeItem(key); return true; } catch { return false; } }
function saveChallenge(value) { challenge = value; storageWrite(sessionStorage, STORAGE_KEY, value); }
function validChallenge(value) {
  return value && UUID.test(value.id || "") && /^[a-f0-9]{64}$/.test(value.challengeToken || "") &&
    typeof value.verificationCode === "string" && value.verificationCode.length <= 160 &&
    value.channel && typeof value.channel.channelName === "string" && CHANNEL.test(value.channel.channelId || "") &&
    (value.purpose === "manage" || Number.isInteger(value.durationDays) && value.durationDays >= 1 && value.durationDays <= 7) &&
    Number.isFinite(Date.parse(value.challengeExpiresAt));
}
function validAccess(value) { return value && CHANNEL.test(value.channelId || "") && /^[a-f0-9]{64}$/.test(value.accessToken || ""); }
function rememberAccess(value, remember = false) {
  access = { channelId: value.channelId, accessToken: value.accessToken };
  storageWrite(localStorage, ACCESS_KEY, null);
  storageWrite(sessionStorage, ACCESS_KEY, access);
  if (remember && !storageWrite(localStorage, ACCESS_KEY, access))
    message("owner-notice", "Your settings are saved, but this browser could not remember private access. Verify your channel again when you return.");
  $("open-saved").hidden = false;
}
function forgetAccess() {
  if (profileBusy || busy) return;
  if (dirty) {
    $("forget-access").textContent = "Discard edits and forget access";
    if ($("forget-access").dataset.confirm !== "yes") { $("forget-access").dataset.confirm = "yes"; return; }
  }
  ownerGeneration++;
  access = owner = draft = enrollment = null; dirty = false;
  storageWrite(localStorage, ACCESS_KEY, null); storageWrite(sessionStorage, ACCESS_KEY, null); saveChallenge(null);
  $("open-saved").hidden = true;
  $("forget-access").textContent = "Forget access on this browser"; delete $("forget-access").dataset.confirm;
  startOver("manage");
  message("notice", "Access was removed from this browser. Your saved settings and signup are unchanged. Verify your channel to open them again.");
}
function term(days) { return `${days} ${days === 1 ? "day" : "days"}`; }
function date(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function show(section) {
  activeView = "entry"; $("owner-panel").hidden = true; $("signup-layout").hidden = false;
  for (const id of ["channel-form", "manage-form", "verification", "confirmation"]) $(id).hidden = section !== id;
  $("entry-actions").hidden = !["channel-form", "manage-form"].includes(section);
}
function setBusy(value, action = "") {
  busy = value;
  for (const id of ["continue", "verify", "start-over", "another-channel", "manage-continue", "signup-mode", "manage-mode", "open-saved"]) $(id).disabled = value || profileBusy;
  $("channel-form").setAttribute("aria-busy", String(value)); $("manage-form").setAttribute("aria-busy", String(value)); $("verification").setAttribute("aria-busy", String(value));
  $("continue").textContent = value && action === "create" ? "Checking your channel…" : "Continue to channel verification →";
  $("manage-continue").textContent = value && action === "create" ? "Checking your channel…" : "Verify access to my settings →";
  $("verify").textContent = value && action === "verify" ? "Checking your verification code…" : challenge?.purpose === "manage" ? "Verify & open my settings" : `Verify & activate for ${term(challenge?.durationDays || 1)}`;
}
async function request(path, body, { method = "POST", token } = {}) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(API + path, { method, headers: { ...(body !== undefined && { "Content-Type": "application/json" }), ...(token && { Authorization: `Bearer ${token}` }) },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: controller.signal, credentials: "omit", redirect: "error", cache: "no-store" });
    const text = await response.text();
    if (text.length > 150_000) throw new Error("The service returned an unexpected response. Please try again.");
    let result; try { result = JSON.parse(text); } catch { throw new Error("The Flexbot service is unavailable right now. Please try again shortly."); }
    if (!response.ok) {
      const error = new Error(typeof result.error === "string" ? result.error : "Your request could not be completed. Please try again.");
      error.code = result.code; error.status = response.status; throw error;
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError" || error instanceof TypeError) throw new Error("Could not reach the Flexbot service. Your edits are still here. Check your connection and try again.");
    throw error;
  } finally { clearTimeout(timer); }
}
function renderVerification() {
  show("verification"); $("channel-name").textContent = challenge.channel.channelName;
  $("channel-link").href = `https://www.youtube.com/channel/${challenge.channel.channelId}`;
  $("verification-code").textContent = challenge.verificationCode;
  $("proof-expiry").textContent = `This code can be verified until ${date(challenge.challengeExpiresAt)}. YouTube may take a moment to publish your description change.`;
  const managing = challenge.purpose === "manage";
  $("verification-term").textContent = managing ? "This opens your private settings." : `You’re choosing ${term(challenge.durationDays)} of Flexbot.`;
  $("verification-explanation").textContent = managing ? "Verifying access does not activate, renew, or change your signup period." : "This starts the full selected period. You cannot cancel or shorten it once activated. Your previous saved settings will be restored unless the admin cleared them.";
  $("proof-last-step").textContent = managing ? "Come back here and open your settings. You can remove the code after verification." : "Come back here and activate your signup. You can remove the code after verification.";
  $("start-over").textContent = managing ? "Use a different channel" : "Use a different channel or duration";
  setBusy(false);
}
function validEnrollment(value) { return value && typeof value.channelName === "string" && Number.isFinite(Date.parse(value.startsAt)) && Number.isFinite(Date.parse(value.expiresAt)) && Number.isInteger(value.durationDays) && value.durationDays >= 1 && value.durationDays <= 7; }
function renderEnrollment(value) {
  if (!validEnrollment(value)) throw new Error("The service did not return a complete confirmation. Check the same signup again.");
  enrollment = value; show("confirmation"); $("enrolled-name").textContent = value.channelName;
  $("enrolled-duration").textContent = term(value.durationDays); $("enrolled-start").textContent = date(value.startsAt); $("enrolled-end").textContent = date(value.expiresAt);
  updateRemaining();
}
function updateRemaining() {
  if (enrollment) {
    const total = Math.max(0, Math.ceil((Date.parse(enrollment.expiresAt) - Date.now()) / 60_000));
    const days = Math.floor(total / 1440), hours = Math.floor(total % 1440 / 60), minutes = total % 60;
    $("time-remaining").textContent = total ? `${days ? `${days}d ` : ""}${hours}h ${minutes}m` : "Expired";
    $("confirmation-title").textContent = total ? "You’re on the list." : "Your signup has ended.";
  }
  if (owner) {
    const active = enrollment && Date.parse(enrollment.expiresAt) > Date.now();
    $("owner-term-title").textContent = active ? "Your signup is active" : "Your settings are saved · bot access is inactive";
    $("owner-term-copy").textContent = active ? `Flexbot can run in your live chat until ${date(enrollment.expiresAt)}. Only the admin can change this end date.` : enrollment ? `Your signup ended ${date(enrollment.expiresAt)}. You can still edit your settings; sign up again to reactivate Flexbot.` : "Choose a 1–7 day signup to activate Flexbot. Editing settings does not activate the bot.";
    $("renew").hidden = Boolean(active);
  }
}
function startOver(mode = entryMode) {
  if (busy || profileBusy) return;
  entryMode = mode; saveChallenge(null); clearMessages();
  $("consent").checked = false; $("manage-consent").checked = false;
  $("signup-mode").classList.toggle("selected", mode === "signup"); $("signup-mode").setAttribute("aria-pressed", String(mode === "signup"));
  $("manage-mode").classList.toggle("selected", mode === "manage"); $("manage-mode").setAttribute("aria-pressed", String(mode === "manage"));
  show(mode === "manage" ? "manage-form" : "channel-form");
}
async function createChallenge(event, manage = false) {
  event.preventDefault(); if (busy || profileBusy || !event.currentTarget.reportValidity()) return;
  clearMessages(); setBusy(true, "create");
  try {
    const body = manage ? { channelUrl: $("manage-channel").value.trim(), consent: $("manage-consent").checked } : { channelUrl: $("channel").value.trim(), durationDays: Number($("duration").value), consent: $("consent").checked };
    const result = await request(manage ? "/api/owner/challenges" : "/api/challenges", body);
    if (!validChallenge(result)) throw new Error("The service returned an incomplete verification. Please try again.");
    saveChallenge(result); renderVerification(); $("verification-title").setAttribute("tabindex", "-1"); $("verification-title").focus();
  } catch (error) { message("error", error.message); } finally { setBusy(false); }
}

function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function validProfile(value) {
  try { validateWebsiteProfile(value); return true; } catch { return false; }
}
function adoptOwner(result) {
  const value = result?.owner;
  if (!value || !CHANNEL.test(value.channelId || "") || typeof value.channelName !== "string" || !validProfile(value.profile) || !Number.isSafeInteger(value.profileRevision) || value.profileRevision < 0 || (access && value.channelId !== access.channelId))
    throw new Error("The service did not return complete channel settings. Your current edits were kept.");
  if (result.enrollment !== null && result.enrollment !== undefined && !validEnrollment(result.enrollment)) throw new Error("The service returned an incomplete signup status.");
  owner = { channelId: value.channelId, channelName: value.channelName, profileRevision: value.profileRevision };
  draft = { ...structuredClone(value.profile), version: 2, lmStudio: structuredClone(value.profile.lmStudio || createDefaultWebsiteLm()) };
  enrollment = result.enrollment || null; dirty = false; renderProfile(); showOwner();
}
function showOwner() {
  if (!owner || !draft) return;
  activeView = "owner"; $("signup-layout").hidden = true; $("owner-panel").hidden = false;
  $("owner-channel").textContent = owner.channelName + " ↗";
  $("owner-channel").href = `https://www.youtube.com/channel/${owner.channelId}`;
  updateRemaining();
}
function markDirty() {
  dirty = true; $("discard-confirmation").hidden = true; delete $("forget-access").dataset.confirm;
  $("forget-access").textContent = "Forget access on this browser";
  message("owner-notice"); updateSaveState();
}
function updateSaveState() {
  $("save-state").textContent = profileBusy ? "Saving or loading…" : dirty ? "You have unsaved changes" : "All changes saved";
  $("save-profile").disabled = profileBusy || !dirty;
}
function setProfileBusy(value) {
  profileBusy = value; $("profile-form").setAttribute("aria-busy", String(value));
  for (const control of $("profile-form").querySelectorAll("input,select,textarea,button")) control.disabled = value;
  $("forget-access").disabled = value; $("renew").disabled = value;
  for (const id of ["continue", "verify", "start-over", "another-channel", "manage-continue", "signup-mode", "manage-mode", "open-saved"]) $(id).disabled = value || busy;
  if (!value) updateCounts(); updateSaveState();
}
function field(labelText, id, input) { const label = element("label", "profile-field"); label.htmlFor = id; label.append(element("span", "", labelText)); input.id = id; label.append(input); return label; }
function inputText(value, maxLength, onInput, placeholder = "") {
  const input = element("input"); input.type = "text"; input.value = value; input.maxLength = maxLength; input.required = true; input.placeholder = placeholder;
  input.addEventListener("input", () => { onInput(input.value); markDirty(); }); return input;
}
function textMessage(value, onInput) {
  const input = element("textarea"); input.value = value; input.maxLength = 200; input.required = true; input.rows = 3;
  input.addEventListener("input", () => { onInput(input.value); markDirty(); }); return input;
}
function rowShell(kind, row, index, title) {
  const card = element("article", "profile-row"); card.dataset.rowId = row.id;
  const top = element("div", "profile-row-heading"); top.append(element("h3", "", `${title} ${index + 1}`));
  const actions = element("div", "profile-row-actions"); const enabled = element("label", "check-label"); const check = element("input"); check.type = "checkbox"; check.checked = row.enabled;
  check.setAttribute("aria-label", `Enable ${title.toLowerCase()} ${index + 1}`); check.addEventListener("change", () => { row.enabled = check.checked; if (kind === "greetings") renderGreetingSelect(); markDirty(); }); enabled.append(check, document.createTextNode("Enabled"));
  const remove = element("button", "remove-row", "Remove"); remove.type = "button"; remove.setAttribute("aria-label", `Remove ${title.toLowerCase()} ${index + 1}`);
  remove.addEventListener("click", () => { draft[kind] = draft[kind].filter(item => item.id !== row.id); renderRows(kind); if (kind === "greetings") renderGreetingSelect(); markDirty(); updateCounts(); });
  actions.append(enabled, remove); top.append(actions); card.append(top); return card;
}
function renderRows(kind) {
  const listId = { greetings: "greeting-list", personalGreetings: "personal-list", commands: "command-list" }[kind];
  const list = $(listId); list.replaceChildren();
  const title = { greetings: "Greeting", personalGreetings: "Personal greeting", commands: "Command" }[kind];
  draft[kind].forEach((row, index) => {
    const card = rowShell(kind, row, index, title);
    if (kind === "commands") {
      const grid = element("div", "profile-grid command-fields");
      const name = inputText(row.name, 31, value => { row.name = value; }, "!socials"); name.pattern = "![A-Za-z0-9_\\-]{1,30}";
      name.addEventListener("blur", () => { const normalized = row.name.trim().toLowerCase(); if (normalized !== row.name) { row.name = normalized; name.value = normalized; } });
      grid.append(field(`Command ${index + 1}`, `command-name-${row.id}`, name));
      const cooldown = element("input"); cooldown.type = "number"; cooldown.min = "0"; cooldown.max = "3600"; cooldown.step = "1"; cooldown.required = true; cooldown.value = String(row.cooldownSeconds);
      cooldown.addEventListener("input", () => { row.cooldownSeconds = cooldown.value === "" ? NaN : Number(cooldown.value); markDirty(); });
      grid.append(field("Cooldown (seconds)", `command-cooldown-${row.id}`, cooldown)); card.append(grid);
      card.append(field(`Reply ${index + 1}`, `command-response-${row.id}`, textMessage(row.response, value => { row.response = value; })));
    } else {
      if (kind === "personalGreetings") card.append(field(`Username ${index + 1}`, `personal-username-${row.id}`, inputText(row.username, 100, value => { row.username = value; }, "@username")));
      card.append(field(`${title} message ${index + 1}`, `${kind}-message-${row.id}`, textMessage(row.message, value => { row.message = value; if (kind === "greetings") updateGreetingOptions(); })));
    }
    card.append(element("p", "help", "Up to 200 characters before names and variables expand.")); list.append(card);
  });
  if (!draft[kind].length) list.append(element("p", "empty-list", `No ${kind === "commands" ? "custom commands" : kind === "personalGreetings" ? "personal greetings" : "greetings"} yet. Add your first one below.`));
}
function updateGreetingOptions() {
  for (const option of $("selected-greeting").options) {
    const row = draft.greetings.find(item => item.id === option.value);
    if (row) option.textContent = `Greeting ${draft.greetings.indexOf(row) + 1}: ${row.message.trim().slice(0, 65) || "Write your greeting"}`;
  }
}
function renderGreetingSelect() {
  const enabled = draft.greetings.filter(row => row.enabled);
  if (!enabled.some(row => row.id === draft.selectedGreetingId)) draft.selectedGreetingId = enabled[0]?.id || null;
  const select = $("selected-greeting"); select.replaceChildren();
  if (!enabled.length) { const option = element("option", "", "Add and enable a greeting first"); option.value = ""; select.append(option); }
  for (const row of enabled) { const option = element("option"); option.value = row.id; select.append(option); }
  select.value = draft.selectedGreetingId || ""; updateGreetingOptions();
  $("selected-greeting-label").hidden = draft.greetingMode === "random";
  $("greeting-mode-help").textContent = draft.greetingMode === "random" ? "One of your enabled greetings is chosen for each eligible viewer. Uncheck a greeting to leave it out of the random selection." : "The selected greeting welcomes eligible viewers. Personal greetings take priority for matching usernames.";
}
function updateCounts() {
  if (!draft) return;
  $("lm-username-count").textContent = `${draft.lmStudio.usernameReplies.length} / 20`;
  $("add-lm-username").disabled = profileBusy || draft.lmStudio.usernameReplies.length >= 20;
  for (const [kind, countId, buttonId] of [["greetings", "greeting-count", "add-greeting"], ["personalGreetings", "personal-count", "add-personal"], ["commands", "command-count", "add-command"]]) {
    $(countId).textContent = `${draft[kind].length} / 10`; $(buttonId).disabled = profileBusy || draft[kind].length >= 10;
  }
}
function renderProfile() {
  renderLmSettings();
  $("greetings-enabled").checked = draft.greetingsEnabled; $("greeting-mode").value = draft.greetingMode;
  for (const kind of ["greetings", "personalGreetings", "commands"]) renderRows(kind);
  renderGreetingSelect(); updateCounts(); updateSaveState(); $("discard-confirmation").hidden = true;
}
function addRow(kind) {
  if (profileBusy || !draft || draft[kind].length >= 10) return;
  const row = { id: crypto.randomUUID(), enabled: true, ...(kind === "commands" ? { name: "", response: "", cooldownSeconds: 5 } : { message: "", ...(kind === "personalGreetings" && { username: "" }) }) };
  draft[kind].push(row); renderRows(kind); if (kind === "greetings") renderGreetingSelect(); updateCounts(); markDirty();
  $({ greetings: "greeting-list", personalGreetings: "personal-list", commands: "command-list" }[kind]).lastElementChild.querySelector("textarea,input[type=text]")?.focus();
}
function cleanDraft() {
  const value = structuredClone(draft);
  for (const row of value.greetings) row.message = row.message.trim();
  for (const row of value.personalGreetings) { row.username = row.username.trim(); row.message = row.message.trim(); }
  for (const row of value.commands) { row.name = row.name.trim().toLowerCase(); row.response = row.response.trim(); }
  if (value.greetingsEnabled && !value.greetings.some(row => row.enabled)) throw new Error("Add and enable at least one greeting, or turn off general greetings.");
  const usernames = value.personalGreetings.map(row => row.username.normalize("NFKC").trim().replace(/^@/, "").trim().replace(/\s+/gu, " ").toLowerCase());
  if (new Set(usernames).size !== usernames.length) throw new Error("Use each personal greeting username only once.");
  const commands = value.commands.map(row => row.name);
  if (new Set(commands).size !== commands.length) throw new Error("Use each custom command name only once.");
  for (const row of [...value.greetings, ...value.personalGreetings]) if (!row.message) throw new Error("Write a message for each greeting, or remove the empty greeting.");
  if (value.personalGreetings.some(row => !row.username.replace(/^@+/, ""))) throw new Error("Enter a username for each personal greeting.");
  if (value.commands.some(row => !row.response || !/^![a-z0-9_-]{1,30}$/.test(row.name))) throw new Error("Give each command a !name of 1–30 letters, numbers, underscores, or hyphens, and a reply.");
  if (value.commands.some(row => RESERVED_COMMANDS.has(row.name))) throw new Error("Built-in command names are reserved. Choose a different name for your custom reply.");
  if ([...value.greetings.map(row => row.message), ...value.personalGreetings.flatMap(row => [row.username, row.message]), ...value.commands.map(row => row.response)].some(text => /[\u0000-\u001f\u007f]/.test(text))) throw new Error("Use a single line for each greeting and reply. Remove line breaks or other control characters before saving.");
  return validateWebsiteProfile(value);
}

function styleSelect(value, onChange) {
  const select = element("select");
  for (const [key, title] of Object.entries(WEBSITE_LM_STYLES)) { const option = element("option", "", title); option.value = key; select.append(option); }
  select.value = value; select.addEventListener("change", () => { onChange(select.value); markDirty(); }); return select;
}
function lmInstructions(value, onInput) {
  const input = textMessage(value, onInput); input.maxLength = 1000; input.required = false;
  input.placeholder = "For example: Keep replies short, talk about gaming, and avoid spoilers."; return input;
}
function lmCooldown(value, onInput) {
  const input = element("input"); input.type = "number"; input.min = "10"; input.max = "3600"; input.step = "1"; input.required = true; input.value = String(value);
  input.addEventListener("input", () => { onInput(input.value === "" ? NaN : Number(input.value)); markDirty(); }); return input;
}
function renderLmSettings() {
  const lm = draft.lmStudio;
  $("lm-enabled").checked = lm.enabled;
  $("lm-command").value = lm.command;
  $("lm-user-level").value = lm.userLevel;
  $("lm-style-field").replaceChildren(field("Default reply style", "lm-style", styleSelect(lm.style, value => { lm.style = value; })));
  $("lm-cooldown-field").replaceChildren(field("Per-viewer cooldown (seconds)", "lm-cooldown", lmCooldown(lm.cooldown, value => { lm.cooldown = value; })));
  $("lm-instructions-field").replaceChildren(field("Your channel instructions (optional, up to 1000 characters)", "lm-instructions", lmInstructions(lm.instructions, value => { lm.instructions = value; })));
  renderLmRules();
}
function renderLmRules() {
  const list = $("lm-username-list"); list.replaceChildren();
  const rules = draft.lmStudio.usernameReplies;
  rules.forEach((rule, index) => {
    const card = element("article", "profile-row");
    const top = element("div", "profile-row-heading"); top.append(element("h3", "", `Username rule ${index + 1}`));
    const actions = element("div", "profile-row-actions"), label = element("label", "check-label"), check = element("input");
    check.type = "checkbox"; check.checked = rule.enabled; check.setAttribute("aria-label", `Enable username rule ${index + 1}`);
    check.addEventListener("change", () => { rule.enabled = check.checked; markDirty(); }); label.append(check, document.createTextNode("Enabled"));
    const remove = element("button", "remove-row", "Remove"); remove.type = "button"; remove.setAttribute("aria-label", `Remove username rule ${index + 1}`);
    remove.addEventListener("click", () => { rules.splice(index, 1); renderLmRules(); updateCounts(); markDirty(); });
    actions.append(label, remove); top.append(actions); card.append(top);
    const grid = element("div", "profile-grid");
    grid.append(field("Chat username", `lm-name-${index}`, inputText(rule.username, 100, value => { rule.username = value; }, "@username")),
      field("Reply style", `lm-tone-${index}`, styleSelect(rule.style, value => { rule.style = value; })),
      field("Cooldown (seconds)", `lm-wait-${index}`, lmCooldown(rule.cooldown, value => { rule.cooldown = value; })));
    card.append(grid, field("Extra instructions for this person (optional)", `lm-notes-${index}`, lmInstructions(rule.instructions, value => { rule.instructions = value; })));
    list.append(card);
  });
  if (!rules.length) list.append(element("p", "empty-list", "No automatic username replies. Viewers can still use your reply command when LM Studio is enabled."));
}
$("lm-enabled").addEventListener("change", event => { if (draft) { draft.lmStudio.enabled = event.target.checked; markDirty(); } });
$("lm-command").addEventListener("input", event => { if (draft) { draft.lmStudio.command = event.target.value; markDirty(); } });
$("lm-user-level").addEventListener("change", event => { if (draft) { draft.lmStudio.userLevel = event.target.value; markDirty(); } });
$("add-lm-username").addEventListener("click", () => {
  if (profileBusy || !draft || draft.lmStudio.usernameReplies.length >= 20) return;
  draft.lmStudio.usernameReplies.push({ username: "", enabled: true, style: draft.lmStudio.style, cooldown: 60, instructions: "" });
  renderLmRules(); updateCounts(); markDirty(); $("lm-username-list").lastElementChild.querySelector("input[type=text]")?.focus();
});
async function loadProfile() {
  if (!access || profileBusy) return;
  const generation = ownerGeneration, identity = access; clearOwnerMessages(); setProfileBusy(true);
  try {
    const result = await request("/api/owner/profile", undefined, { method: "GET", token: identity.accessToken });
    if (generation !== ownerGeneration || access !== identity) return;
    adoptOwner(result); message("owner-notice", "Your saved settings are loaded.");
  } catch (error) {
    if (generation !== ownerGeneration) return;
    if (activeView === "owner") message("owner-error", error.message + (error.status === 401 ? " Verify your channel again to recover access." : ""));
    else message("error", error.message + (error.status === 401 ? " Choose Manage my channel to verify access again." : ""));
  } finally { if (generation === ownerGeneration) setProfileBusy(false); }
}
async function acceptVerification(result, remember) {
  if (!result.owner) { if (result.enrollment) renderEnrollment(result.enrollment); return; }
  if (!validAccess(result.owner)) throw new Error("The service did not return private settings access. Retry the same verification.");
  ownerGeneration++; rememberAccess(result.owner, remember); clearOwnerMessages(); adoptOwner(result);
  saveChallenge(null); message("owner-notice", "Channel verified. You can remove the code from your YouTube description and edit your settings below.");
}

$("duration").addEventListener("change", () => { $("consent-duration").textContent = `${$("duration").value}-day`; });
$("signup-mode").addEventListener("click", () => startOver("signup")); $("manage-mode").addEventListener("click", () => startOver("manage"));
$("channel-form").addEventListener("submit", event => void createChallenge(event)); $("manage-form").addEventListener("submit", event => void createChallenge(event, true));
$("verify").addEventListener("click", async () => {
  if (busy || !challenge) return; clearMessages(); setBusy(true, "verify");
  try { await acceptVerification(await request(`/api/challenges/${encodeURIComponent(challenge.id)}/verify`, { challengeToken: challenge.challengeToken, consent: true }), $("remember-access").checked); }
  catch (error) { message("error", error.message); } finally { setBusy(false); }
});
$("copy-code").addEventListener("click", async () => { if (!challenge) return; try { await navigator.clipboard.writeText(challenge.verificationCode); message("notice", "Verification code copied. Add it to your public channel description and publish the change."); } catch { message("notice", "Select and copy the code above, then add it to your public channel description."); } });
$("start-over").addEventListener("click", () => startOver()); $("another-channel").addEventListener("click", () => startOver("signup"));
$("forget-access").addEventListener("click", forgetAccess);
$("open-saved").addEventListener("click", () => { if (owner) showOwner(); else void loadProfile(); });
$("renew").addEventListener("click", () => { if (!owner || profileBusy) return; if (dirty) { message("owner-error", "Save your settings before starting a new signup, or load the saved settings to discard your edits."); return; } startOver("signup"); $("channel").value = `https://www.youtube.com/channel/${owner.channelId}`; $("channel").focus(); });
$("greetings-enabled").addEventListener("change", event => { draft.greetingsEnabled = event.target.checked; markDirty(); });
$("greeting-mode").addEventListener("change", event => { draft.greetingMode = event.target.value; renderGreetingSelect(); markDirty(); });
$("selected-greeting").addEventListener("change", event => { draft.selectedGreetingId = event.target.value || null; markDirty(); });
$("add-greeting").addEventListener("click", () => addRow("greetings")); $("add-personal").addEventListener("click", () => addRow("personalGreetings")); $("add-command").addEventListener("click", () => addRow("commands"));
$("reload-profile").addEventListener("click", () => { if (dirty) $("discard-confirmation").hidden = false; else void loadProfile(); });
$("discard-cancel").addEventListener("click", () => { $("discard-confirmation").hidden = true; });
$("discard-confirm").addEventListener("click", () => void loadProfile());
$("profile-form").addEventListener("submit", async event => {
  event.preventDefault(); if (profileBusy || !access || !owner || !dirty || !event.currentTarget.reportValidity()) return;
  clearOwnerMessages(); let profile;
  try { profile = cleanDraft(); } catch (error) { message("owner-error", error.message); return; }
  const generation = ownerGeneration, identity = access; setProfileBusy(true);
  try {
    const result = await request("/api/owner/profile", { profile, expectedRevision: owner.profileRevision }, { method: "PATCH", token: identity.accessToken });
    if (generation !== ownerGeneration || access !== identity) return;
    adoptOwner(result); message("owner-notice", "Your channel settings are saved.");
  } catch (error) {
    if (generation !== ownerGeneration) return;
    message("owner-error", error.code === "profile_conflict" ? "These settings changed in another session. Your edits are still here. Copy any edits you want to keep, then choose Load saved settings before saving again." : error.message);
  } finally { if (generation === ownerGeneration) setProfileBusy(false); }
});
window.addEventListener("beforeunload", event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
setInterval(updateRemaining, 15000);
async function restore() {
  const savedAccess = storageRead(localStorage, ACCESS_KEY) || storageRead(sessionStorage, ACCESS_KEY);
  if (validAccess(savedAccess)) { access = savedAccess; $("open-saved").hidden = false; await loadProfile(); if (owner) return; }
  const stored = storageRead(sessionStorage, STORAGE_KEY);
  if (!validChallenge(stored)) { saveChallenge(null); return; }
  saveChallenge(stored); entryMode = challenge.purpose === "manage" ? "manage" : "signup"; renderVerification(); setBusy(true);
  try {
    const result = await request(`/api/challenges/${encodeURIComponent(challenge.id)}/status`, { challengeToken: challenge.challengeToken });
    if (result.owner) await acceptVerification(result, false);
    else if (result.enrollment) renderEnrollment(result.enrollment);
    else if (result.status === "expired") { setBusy(false); startOver(entryMode); message("notice", "Your verification code expired. Verify again to open your settings or create a new signup. Existing settings stay saved."); }
    else message("notice", "Your pending verification was restored. Add the code to your description, then verify it below.");
  } catch (error) { message("error", error.message); } finally { setBusy(false); }
}
void restore();
