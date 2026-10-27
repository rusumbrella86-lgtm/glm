const API = "https://flexbot-channel-signup.mrflex420.chatgpt.site";
const STORAGE_KEY = "glm.flexbot.signup.v1";
const $ = (id) => document.getElementById(id);
let challenge = null;
let enrollment = null;
let busy = false;

function message(kind, value = "") {
  const node = $(kind);
  node.textContent = value;
  node.hidden = !value;
}
function clearMessages() { message("error"); message("notice"); }
function saveChallenge(value) {
  challenge = value;
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* The signup still works when browser storage is unavailable. */ }
}
function validChallenge(value) {
  return value && typeof value.id === "string" && value.id.length < 100 &&
    typeof value.challengeToken === "string" && value.challengeToken.length >= 20 && value.challengeToken.length <= 256 &&
    typeof value.verificationCode === "string" && value.verificationCode.length <= 160 &&
    value.channel && typeof value.channel.channelName === "string" &&
    /^UC[\w-]{22}$/.test(value.channel.channelId || "") &&
    Number.isInteger(value.durationDays) && value.durationDays >= 1 && value.durationDays <= 7 &&
    Number.isFinite(Date.parse(value.challengeExpiresAt));
}
function term(days) { return `${days} ${days === 1 ? "day" : "days"}`; }
function date(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function show(section) {
  $("channel-form").hidden = section !== "channel-form";
  $("verification").hidden = section !== "verification";
  $("confirmation").hidden = section !== "confirmation";
}
function setBusy(value, action = "") {
  busy = value;
  for (const id of ["continue", "verify", "start-over", "another-channel"])
    $(id).disabled = value;
  $("channel-form").setAttribute("aria-busy", String(value));
  $("verification").setAttribute("aria-busy", String(value));
  $("continue").textContent = value && action === "create" ? "Checking your channel…" : "Continue to channel verification →";
  $("verify").textContent = value && action === "verify" ? "Checking your verification code…" : `Verify & activate for ${term(challenge?.durationDays || 1)}`;
}
async function request(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: controller.signal, credentials: "omit", redirect: "error", cache: "no-store" });
    const text = await response.text();
    if (text.length > 30_000) throw new Error("The signup service returned an unexpected response. Please try again.");
    let result;
    try { result = JSON.parse(text); } catch { throw new Error("The signup service is unavailable right now. Please try again shortly."); }
    if (!response.ok) {
      const error = new Error(typeof result.error === "string" ? result.error : "Your signup could not be completed. Please try again.");
      error.code = result.code;
      throw error;
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError" || error instanceof TypeError)
      throw new Error("Could not reach the signup service. Check your connection and try again. If activation was already sent, retrying will check the same signup.");
    throw error;
  } finally { clearTimeout(timer); }
}
function renderVerification() {
  show("verification");
  $("channel-name").textContent = challenge.channel.channelName;
  $("channel-link").href = `https://www.youtube.com/channel/${challenge.channel.channelId}`;
  $("verification-code").textContent = challenge.verificationCode;
  $("proof-expiry").textContent = `This code can be verified until ${date(challenge.challengeExpiresAt)}. YouTube may take a moment to publish your description change.`;
  $("verification-term").textContent = `You’re choosing ${term(challenge.durationDays)} of Flexbot.`;
  $("verify").textContent = `Verify & activate for ${term(challenge.durationDays)}`;
}
function renderEnrollment(value) {
  if (!value || typeof value.channelName !== "string" || !Number.isFinite(Date.parse(value.startsAt)) ||
      !Number.isFinite(Date.parse(value.expiresAt)) || !Number.isInteger(value.durationDays) || value.durationDays < 1 || value.durationDays > 7)
    throw new Error("The signup service did not return a complete confirmation. Check the same signup again.");
  enrollment = value;
  show("confirmation");
  $("enrolled-name").textContent = value.channelName;
  $("enrolled-duration").textContent = term(value.durationDays);
  $("enrolled-start").textContent = date(value.startsAt);
  $("enrolled-end").textContent = date(value.expiresAt);
  updateRemaining();
}
function updateRemaining() {
  if (!enrollment) return;
  const total = Math.max(0, Math.ceil((Date.parse(enrollment.expiresAt) - Date.now()) / 60_000));
  const days = Math.floor(total / 1440), hours = Math.floor(total % 1440 / 60), minutes = total % 60;
  $("time-remaining").textContent = total ? `${days ? `${days}d ` : ""}${hours}h ${minutes}m` : "Expired";
  if (!total) {
    $("confirmation-title").textContent = "Your signup has ended.";
    message("notice", "This signup has expired. To invite Flexbot again, add your channel and verify a new signup.");
  }
}
function startOver() {
  if (busy) return;
  saveChallenge(null);
  enrollment = null;
  clearMessages();
  $("confirmation-title").textContent = "You’re on the list.";
  $("consent").checked = false;
  show("channel-form");
  $("channel").focus();
}
$("duration").addEventListener("change", () => { $("consent-duration").textContent = `${$("duration").value}-day`; });
$("channel-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !event.currentTarget.reportValidity()) return;
  clearMessages();
  setBusy(true, "create");
  try {
    const result = await request("/api/challenges", { channelUrl: $("channel").value.trim(), durationDays: Number($("duration").value), consent: $("consent").checked });
    if (!validChallenge(result)) throw new Error("The signup service returned an incomplete verification. Please try again.");
    saveChallenge(result);
    renderVerification();
    $("verification-title").setAttribute("tabindex", "-1");
    $("verification-title").focus();
  } catch (error) { message("error", error.message); }
  finally { setBusy(false); }
});
$("verify").addEventListener("click", async () => {
  if (busy || !challenge) return;
  clearMessages();
  setBusy(true, "verify");
  try {
    const result = await request(`/api/challenges/${encodeURIComponent(challenge.id)}/verify`, { challengeToken: challenge.challengeToken, consent: true });
    renderEnrollment(result.enrollment);
    $("confirmation-title").setAttribute("tabindex", "-1");
    $("confirmation-title").focus();
  } catch (error) { message("error", error.message); }
  finally { setBusy(false); }
});
$("copy-code").addEventListener("click", async () => {
  if (!challenge) return;
  try { await navigator.clipboard.writeText(challenge.verificationCode); message("notice", "Verification code copied. Add it to your public channel description and publish the change."); }
  catch { message("notice", "Select and copy the code above, then add it to your public channel description."); }
});
$("start-over").addEventListener("click", startOver);
$("another-channel").addEventListener("click", startOver);
setInterval(updateRemaining, 15000);

async function restore() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const value = JSON.parse(stored);
    if (!validChallenge(value)) { saveChallenge(null); return; }
    saveChallenge(value);
    renderVerification();
    setBusy(true);
    const state = await request(`/api/challenges/${encodeURIComponent(challenge.id)}/status`, { challengeToken: challenge.challengeToken });
    if (state.status === "active" && state.enrollment) renderEnrollment(state.enrollment);
    else if (state.status === "expired") {
      startExpired();
    } else message("notice", "Your pending signup was restored. Add the code to your description, then verify it below.");
  } catch (error) {
    if (challenge) message("error", error.message);
  } finally { setBusy(false); }
}
function startExpired() {
  saveChallenge(null);
  show("channel-form");
  $("consent").checked = false;
  message("notice", "Your previous verification code expired. Start again to receive a fresh code. No new signup was activated.");
}
void restore();
