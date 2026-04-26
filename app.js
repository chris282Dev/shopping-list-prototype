import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig, googleCalendarConfig } from "./firebase-config.js";

const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const emailLoginForm = document.querySelector("#email-login-form");
const emailRegisterForm = document.querySelector("#email-register-form");
const emailLoginInput = document.querySelector("#email-login-input");
const emailLoginPassword = document.querySelector("#email-login-password");
const registerNameInput = document.querySelector("#register-name-input");
const registerEmailInput = document.querySelector("#register-email-input");
const registerPasswordInput = document.querySelector("#register-password-input");
const authMessage = document.querySelector("#auth-message");
const appMessage = document.querySelector("#app-message");
const shoppingView = document.querySelector("#shopping-view");
const calendarView = document.querySelector("#calendar-view");
const viewSwitcher = document.querySelector("#view-switcher");
const shoppingViewButton = document.querySelector("#shopping-view-button");
const calendarViewButton = document.querySelector("#calendar-view-button");
const approvalPanel = document.querySelector("#approval-panel");
const adminPanel = document.querySelector("#admin-panel");
const createHouseholdForm = document.querySelector("#create-household-form");
const joinHouseholdForm = document.querySelector("#join-household-form");
const itemForm = document.querySelector("#item-form");
const householdInput = document.querySelector("#household-input");
const joinCodeInput = document.querySelector("#join-code-input");
const itemInput = document.querySelector("#item-input");
const quantityInput = document.querySelector("#quantity-input");
const categoryInput = document.querySelector("#category-input");
const householdName = document.querySelector("#household-name");
const userName = document.querySelector("#user-name");
const userAvatar = document.querySelector("#user-avatar");
const invitePanel = document.querySelector("#invite-panel");
const inviteCode = document.querySelector("#invite-code");
const copyCodeButton = document.querySelector("#copy-code-button");
const listsPanel = document.querySelector("#lists-panel");
const listSelect = document.querySelector("#list-select");
const newListButton = document.querySelector("#new-list-button");
const editListButton = document.querySelector("#edit-list-button");
const listEditor = document.querySelector("#list-editor");
const listNameInput = document.querySelector("#list-name-input");
const listOrderList = document.querySelector("#list-order-list");
const cancelListButton = document.querySelector("#cancel-list-button");
const listPanel = document.querySelector("#list-panel");
const pendingUsers = document.querySelector("#pending-users");
const pendingCount = document.querySelector("#pending-count");
const shoppingList = document.querySelector("#shopping-list");
const itemCount = document.querySelector("#item-count");
const calendarStatusPill = document.querySelector("#calendar-status-pill");
const connectCalendarButton = document.querySelector("#connect-calendar-button");
const refreshCalendarButton = document.querySelector("#refresh-calendar-button");
const calendarRangeSelect = document.querySelector("#calendar-range-select");
const calendarSourceSelect = document.querySelector("#calendar-source-select");
const calendarMessage = document.querySelector("#calendar-message");
const calendarEvents = document.querySelector("#calendar-events");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const CATEGORY_OPTIONS = [
  "Obst & Gemüse",
  "Kühlschrank",
  "Getränke",
  "Backen & Kochen",
  "Drogerie",
  "Haushalt",
  "Allgemein",
];

let unsubscribeItems = null;
let unsubscribePendingUsers = null;
let unsubscribeLists = null;
let editingItemId = null;
let currentItems = [];
let currentShoppingLists = [];
let currentHouseholdId = null;
let activeListId = null;
let editingListId = null;
let editingListOrder = [...CATEGORY_OPTIONS];
let completedCollapsed = false;
let activeView = "shopping";
let googleCalendarInitialized = false;
let googleCalendarReady = false;
let googleCalendarAccessToken = "";
let googleCalendarTokenClient = null;
let googleCalendarCalendars = [];
let currentCalendarEvents = [];

function setMessage(target, message, isError = false) {
  target.textContent = message;
  target.style.color = isError ? "var(--danger)" : "";
}

function clearMessage(target) {
  target.textContent = "";
  target.style.color = "";
}

function setCalendarConnectionState(isConnected) {
  googleCalendarReady = isConnected;
  calendarStatusPill.textContent = isConnected ? "Verbunden" : "Nicht verbunden";
  refreshCalendarButton.disabled = !isConnected;
  calendarRangeSelect.disabled = !isConnected;
  calendarSourceSelect.disabled = !isConnected;
  connectCalendarButton.textContent = isConnected
    ? "Google Kalender erneut verbinden"
    : "Google Kalender verbinden";
}

function renderActiveView() {
  const showShopping = activeView === "shopping";
  shoppingView.classList.toggle("hidden", !showShopping);
  calendarView.classList.toggle("hidden", showShopping);
  shoppingViewButton.classList.toggle("view-button-active", showShopping);
  calendarViewButton.classList.toggle("view-button-active", !showShopping);
}

function getCalendarDateLabel(event) {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) {
    return "Ohne Datum";
  }

  if (event.start?.date) {
    return new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(event.start.date));
  }

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.start.dateTime));
}

function renderCalendarSources() {
  const previousValue = calendarSourceSelect.value || "all";
  calendarSourceSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Alle Kalender";
  calendarSourceSelect.append(allOption);

  for (const calendar of googleCalendarCalendars) {
    const option = document.createElement("option");
    option.value = calendar.id;
    option.textContent = calendar.summaryOverride || calendar.summary || "Unbenannter Kalender";
    calendarSourceSelect.append(option);
  }

  const validValue = [allOption.value, ...googleCalendarCalendars.map((entry) => entry.id)].includes(
    previousValue,
  )
    ? previousValue
    : "all";
  calendarSourceSelect.value = validValue;
}

function renderCalendarEvents(events = []) {
  calendarEvents.innerHTML = "";
  currentCalendarEvents = events;

  if (!events.length) {
    const emptyState = document.createElement("li");
    emptyState.className = "calendar-event-row";

    const title = document.createElement("p");
    title.className = "calendar-event-title";
    title.textContent = googleCalendarReady
      ? "Keine Termine im gewählten Zeitraum"
      : "Noch kein Kalender verbunden";

    const meta = document.createElement("p");
    meta.className = "calendar-event-meta";
    meta.textContent = googleCalendarReady
      ? "Versuche einen anderen Zeitraum oder einen anderen Kalender."
      : "Verbinde zuerst euren Google Kalender, um Termine zu sehen.";

    emptyState.append(title, meta);
    calendarEvents.append(emptyState);
    return;
  }

  for (const event of events) {
    const row = document.createElement("li");
    row.className = "calendar-event-row";

    const title = document.createElement("p");
    title.className = "calendar-event-title";
    title.textContent = event.summary || "Ohne Titel";

    const meta = document.createElement("p");
    meta.className = "calendar-event-meta";
    meta.textContent = `${getCalendarDateLabel(event)} • ${
      event._calendarName || "Kalender"
    }`;

    row.append(title, meta);

    if (event.location) {
      const location = document.createElement("p");
      location.className = "calendar-event-location";
      location.textContent = event.location;
      row.append(location);
    }

    calendarEvents.append(row);
  }
}

function getCalendarRange() {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  const range = calendarRangeSelect.value || "today";

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (range === "week") {
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function ensureGoogleCalendarConfigured() {
  return Boolean(
    googleCalendarConfig?.apiKey?.trim() && googleCalendarConfig?.clientId?.trim(),
  );
}

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function formatTimestamp(value) {
  if (!value?.toDate) {
    return "Gerade eben";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value.toDate());
}

function getDisplayNameForUser(user, existingData = null) {
  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  if (existingData?.name?.trim()) {
    return existingData.name.trim();
  }

  if (user.email) {
    return user.email.split("@")[0];
  }

  return "Neuer Nutzer";
}

function formatAuthError(error) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("auth/email-already-in-use")) {
    return "Diese E-Mail-Adresse ist bereits registriert.";
  }

  if (
    message.includes("auth/invalid-credential") ||
    message.includes("auth/user-not-found") ||
    message.includes("auth/wrong-password") ||
    message.includes("auth/invalid-login-credentials")
  ) {
    return "E-Mail oder Passwort sind nicht korrekt.";
  }

  if (message.includes("auth/weak-password")) {
    return "Das Passwort ist zu schwach. Bitte waehle mindestens 6 Zeichen.";
  }

  if (message.includes("auth/invalid-email")) {
    return "Bitte gib eine gueltige E-Mail-Adresse ein.";
  }

  if (message.includes("auth/operation-not-allowed")) {
    return "E-Mail-Login ist noch nicht aktiviert.";
  }

  return message || "Anmeldung fehlgeschlagen.";
}

function buildCategoryOptions(selectedValue) {
  return CATEGORY_OPTIONS.map((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = category === selectedValue;
    return option;
  });
}

function waitForGlobal(globalName, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    function check() {
      if (window[globalName]) {
        resolve(window[globalName]);
        return;
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`${globalName} konnte nicht geladen werden.`));
        return;
      }

      window.setTimeout(check, 50);
    }

    check();
  });
}

async function initializeGoogleCalendar() {
  if (googleCalendarInitialized) {
    return;
  }

  if (!ensureGoogleCalendarConfigured()) {
    setMessage(
      calendarMessage,
      "Google Kalender ist noch nicht fertig konfiguriert. Es fehlen API-Key oder Client-ID.",
      true,
    );
    return;
  }

  const gapi = await waitForGlobal("gapi");
  const google = await waitForGlobal("google");

  await new Promise((resolve, reject) => {
    gapi.load("client", {
      callback: resolve,
      onerror: () => reject(new Error("Google API Client konnte nicht geladen werden.")),
      timeout: 10000,
      ontimeout: () => reject(new Error("Google API Client hat beim Laden zu lange gebraucht.")),
    });
  });

  await gapi.client.init({
    apiKey: googleCalendarConfig.apiKey,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
  });

  googleCalendarTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: googleCalendarConfig.clientId,
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    callback: "",
  });

  googleCalendarInitialized = true;
}

function requestGoogleCalendarAccess() {
  return new Promise(async (resolve, reject) => {
    try {
      await initializeGoogleCalendar();
      if (!googleCalendarTokenClient) {
        reject(new Error("Google Kalender ist noch nicht konfiguriert."));
        return;
      }

      googleCalendarTokenClient.callback = (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        googleCalendarAccessToken = response.access_token;
        setCalendarConnectionState(true);
        resolve(response);
      };

      googleCalendarTokenClient.requestAccessToken({
        prompt: googleCalendarAccessToken ? "" : "consent",
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function loadGoogleCalendars() {
  const { gapi } = window;
  const response = await gapi.client.calendar.calendarList.list({
    showHidden: false,
  });

  googleCalendarCalendars = (response.result.items || []).filter(
    (entry) => entry.accessRole && entry.accessRole !== "none",
  );

  renderCalendarSources();
}

async function loadGoogleCalendarEvents() {
  if (!googleCalendarReady) {
    renderCalendarEvents([]);
    return;
  }

  clearMessage(calendarMessage);

  try {
    await loadGoogleCalendars();

    const selectedCalendarId = calendarSourceSelect.value || "all";
    const calendarsToLoad =
      selectedCalendarId === "all"
        ? googleCalendarCalendars
        : googleCalendarCalendars.filter((entry) => entry.id === selectedCalendarId);

    const { start, end } = getCalendarRange();
    const { gapi } = window;

    const eventResponses = await Promise.all(
      calendarsToLoad.map(async (calendar) => {
        const response = await gapi.client.calendar.events.list({
          calendarId: calendar.id,
          singleEvents: true,
          orderBy: "startTime",
          showDeleted: false,
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          maxResults: 50,
        });

        return (response.result.items || []).map((event) => ({
          ...event,
          _calendarName: calendar.summaryOverride || calendar.summary || "Kalender",
        }));
      }),
    );

    const mergedEvents = eventResponses
      .flat()
      .sort((left, right) => {
        const leftValue = left.start?.dateTime || left.start?.date || "";
        const rightValue = right.start?.dateTime || right.start?.date || "";
        return new Date(leftValue).getTime() - new Date(rightValue).getTime();
      });

    renderCalendarEvents(mergedEvents);
    calendarStatusPill.textContent = calendarsToLoad.length
      ? `${calendarsToLoad.length} Kalender`
      : "Verbunden";
  } catch (error) {
    setMessage(
      calendarMessage,
      error instanceof Error ? error.message : "Kalendertermine konnten nicht geladen werden.",
      true,
    );
  }
}

function getActiveShoppingList() {
  return currentShoppingLists.find((entry) => entry.id === activeListId) || null;
}

function getActiveCategoryOrder() {
  const activeList = getActiveShoppingList();
  return activeList?.categoryOrder?.length ? activeList.categoryOrder : CATEGORY_OPTIONS;
}

function stopItemsListener() {
  if (unsubscribeItems) {
    unsubscribeItems();
    unsubscribeItems = null;
  }
}

function stopPendingUsersListener() {
  if (unsubscribePendingUsers) {
    unsubscribePendingUsers();
    unsubscribePendingUsers = null;
  }
}

function stopListsListener() {
  if (unsubscribeLists) {
    unsubscribeLists();
    unsubscribeLists = null;
  }
}

function resetListEditor() {
  editingListId = null;
  editingListOrder = [...CATEGORY_OPTIONS];
  listNameInput.value = "";
  listEditor.classList.add("hidden");
  renderListOrderEditor();
}

function moveListCategory(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= editingListOrder.length) {
    return;
  }

  const nextOrder = [...editingListOrder];
  [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];
  editingListOrder = nextOrder;
  renderListOrderEditor();
}

function renderListOrderEditor() {
  listOrderList.innerHTML = "";

  for (const [index, category] of editingListOrder.entries()) {
    const item = document.createElement("li");
    item.className = "profile-order-item";

    const number = document.createElement("span");
    number.className = "profile-order-number";
    number.textContent = `${index + 1}`;

    const label = document.createElement("span");
    label.textContent = category;

    const actions = document.createElement("div");
    actions.className = "profile-order-actions";

    const upButton = document.createElement("button");
    upButton.className = "move-button";
    upButton.type = "button";
    upButton.textContent = "Nach oben";
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => moveListCategory(index, -1));

    const downButton = document.createElement("button");
    downButton.className = "move-button";
    downButton.type = "button";
    downButton.textContent = "Nach unten";
    downButton.disabled = index === editingListOrder.length - 1;
    downButton.addEventListener("click", () => moveListCategory(index, 1));

    actions.append(upButton, downButton);
    item.append(number, label, actions);
    listOrderList.append(item);
  }
}

function openListEditor(list = null) {
  editingListId = list?.id ?? null;
  listNameInput.value = list?.name ?? "";
  editingListOrder = list?.categoryOrder?.length
    ? [...list.categoryOrder]
    : [...CATEGORY_OPTIONS];
  renderListOrderEditor();
  listEditor.classList.remove("hidden");
}

function renderListSelector() {
  listSelect.innerHTML = "";

  for (const shoppingListEntry of currentShoppingLists) {
    const option = document.createElement("option");
    option.value = shoppingListEntry.id;
    option.textContent = shoppingListEntry.name;
    option.selected = shoppingListEntry.id === activeListId;
    listSelect.append(option);
  }

  listSelect.disabled = currentShoppingLists.length === 0;
  editListButton.disabled = !activeListId;
}

function buildItemRow(item) {
  const listItem = document.createElement("li");
  listItem.className = `item-row${item.checked ? " checked" : ""}`;
  const isEditing = editingItemId === item.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(item.checked);
  checkbox.setAttribute("aria-label", `${item.name} abhaken`);
  checkbox.disabled = isEditing;
  checkbox.addEventListener("change", async () => {
    await updateDoc(doc(db, "items", item.id), {
      checked: checkbox.checked,
      updatedAt: serverTimestamp(),
    });
  });

  const content = document.createElement("div");
  content.className = "item-copy";
  const itemName = document.createElement("p");
  const topLine = document.createElement("div");
  const itemQuantity = document.createElement("span");
  const itemCategory = document.createElement("span");
  const itemMeta = document.createElement("p");
  topLine.className = "item-topline";
  itemName.className = "item-name";
  itemQuantity.className = "item-quantity";
  itemCategory.className = "item-category";
  itemMeta.className = "item-meta";
  itemName.textContent = item.name || "Unbenannter Eintrag";
  itemQuantity.textContent = item.quantity || "1x";
  itemCategory.textContent = item.category || "Allgemein";
  itemMeta.textContent = `Von ${item.createdByName || "Unbekannt"} • ${formatTimestamp(item.createdAt)}`;
  topLine.append(itemName, itemQuantity, itemCategory);
  content.append(topLine, itemMeta);

  if (isEditing) {
    const editForm = document.createElement("form");
    editForm.className = "edit-form";

    const editGrid = document.createElement("div");
    editGrid.className = "edit-grid";

    const nameField = document.createElement("input");
    nameField.type = "text";
    nameField.maxLength = 80;
    nameField.required = true;
    nameField.value = item.name || "";

    const quantityField = document.createElement("input");
    quantityField.type = "text";
    quantityField.maxLength = 20;
    quantityField.value = item.quantity || "";
    quantityField.placeholder = "Menge";

    const categoryField = document.createElement("select");
    categoryField.append(...buildCategoryOptions(item.category || "Allgemein"));

    editGrid.append(nameField, quantityField, categoryField);

    const editActions = document.createElement("div");
    editActions.className = "edit-actions";

    const saveButton = document.createElement("button");
    saveButton.className = "secondary-button";
    saveButton.type = "submit";
    saveButton.textContent = "Speichern";

    const cancelButton = document.createElement("button");
    cancelButton.className = "ghost-button";
    cancelButton.type = "button";
    cancelButton.textContent = "Abbrechen";
    cancelButton.addEventListener("click", () => {
      editingItemId = null;
      renderItems(currentItems);
    });

    editActions.append(saveButton, cancelButton);
    editForm.append(editGrid, editActions);

    editForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const updatedName = nameField.value.trim();
      if (!updatedName) {
        setMessage(appMessage, "Bitte gib einen Artikelnamen ein.", true);
        return;
      }

      await updateDoc(doc(db, "items", item.id), {
        name: updatedName,
        quantity: quantityField.value.trim() || "1x",
        category: categoryField.value || "Allgemein",
        updatedAt: serverTimestamp(),
      });

      editingItemId = null;
    });

    content.append(editForm);
  }

  const actions = document.createElement("div");
  actions.className = "item-actions";

  const editButton = document.createElement("button");
  editButton.className = "edit-button";
  editButton.type = "button";
  editButton.textContent = isEditing ? "Wird bearbeitet" : "Bearbeiten";
  editButton.disabled = isEditing;
  editButton.addEventListener("click", () => {
    editingItemId = item.id;
    renderItems(currentItems);
  });

  const removeButton = document.createElement("button");
  removeButton.className = "danger-button";
  removeButton.type = "button";
  removeButton.textContent = "Entfernen";
  removeButton.addEventListener("click", async () => {
    await deleteDoc(doc(db, "items", item.id));
  });

  actions.append(editButton, removeButton);
  listItem.append(checkbox, content, actions);
  return listItem;
}

function appendCategoryGroups(items) {
  const orderedCategories = getActiveCategoryOrder();
  const groupedItems = new Map();

  for (const item of items) {
    const category = item.category || "Allgemein";
    if (!groupedItems.has(category)) {
      groupedItems.set(category, []);
    }
    groupedItems.get(category).push(item);
  }

  const finalCategoryOrder = [
    ...orderedCategories,
    ...[...groupedItems.keys()].filter((category) => !orderedCategories.includes(category)),
  ];

  for (const category of finalCategoryOrder) {
    const categoryItems = groupedItems.get(category);
    if (!categoryItems?.length) {
      continue;
    }

    const heading = document.createElement("li");
    heading.className = "category-heading";

    const headingTitle = document.createElement("p");
    headingTitle.className = "category-heading-title";
    headingTitle.textContent = category;

    const headingCount = document.createElement("span");
    headingCount.className = "category-heading-count";
    headingCount.textContent = `${categoryItems.length} Artikel`;

    heading.append(headingTitle, headingCount);
    shoppingList.append(heading);

    for (const item of categoryItems) {
      shoppingList.append(buildItemRow(item));
    }
  }
}

async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const existingProfile = await getDoc(userRef);
  const existingData = existingProfile.exists() ? existingProfile.data() : null;

  await setDoc(
    userRef,
    {
      email: user.email,
      name: getDisplayNameForUser(user, existingData),
      householdId: existingData ? (existingData.householdId ?? null) : null,
      approvalStatus: existingData
        ? (existingData.approvalStatus ?? "pending")
        : "pending",
      approvedBy: existingData?.approvedBy ?? null,
      role: existingData?.role ?? "user",
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? snapshot.data() : null;
}

async function createHousehold(user, name) {
  const code = generateJoinCode();
  const cleanedName = name.trim();
  const householdRef = doc(collection(db, "households"));

  if (!cleanedName) {
    throw new Error("Bitte gib einen Namen fuer den Haushalt ein.");
  }

  await setDoc(householdRef, {
    activeListId: null,
    code,
    createdAt: serverTimestamp(),
    members: [user.uid],
    name: cleanedName,
    ownerId: user.uid,
  });

  await updateDoc(doc(db, "users", user.uid), {
    householdId: householdRef.id,
    updatedAt: serverTimestamp(),
  });
}

async function joinHousehold(user, code) {
  const cleanedCode = code.trim().toUpperCase();
  if (!cleanedCode) {
    throw new Error("Bitte gib einen Einladungs-Code ein.");
  }

  const codeQuery = query(
    collection(db, "households"),
    where("code", "==", cleanedCode),
    limit(1),
  );
  const snapshot = await getDocs(codeQuery);

  if (snapshot.empty) {
    throw new Error("Kein Haushalt mit diesem Code gefunden.");
  }

  await updateDoc(doc(db, "users", user.uid), {
    householdId: snapshot.docs[0].id,
    updatedAt: serverTimestamp(),
  });
}

async function ensureDefaultShoppingList(user) {
  if (!currentHouseholdId || currentShoppingLists.length > 0) {
    return;
  }

  const listRef = await addDoc(collection(db, "shoppingLists"), {
    categoryOrder: CATEGORY_OPTIONS,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    householdId: currentHouseholdId,
    isDefault: true,
    name: "Standardliste",
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "households", currentHouseholdId), {
    activeListId: listRef.id,
  });
}

function renderItems(items) {
  shoppingList.innerHTML = "";
  currentItems = items;

  const activeList = getActiveShoppingList();
  const visibleItems = items.filter((item) => {
    if (!activeList) {
      return false;
    }

    if (item.listId) {
      return item.listId === activeList.id;
    }

    return Boolean(activeList.isDefault);
  });

  itemCount.textContent = `${visibleItems.length} Artikel`;

  if (visibleItems.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "item-row";
    const spacer = document.createElement("div");
    const content = document.createElement("div");
    const title = document.createElement("p");
    const meta = document.createElement("p");
    title.className = "item-name";
    meta.className = "item-meta";
    title.textContent = activeList ? "Diese Liste ist noch leer" : "Noch nichts auf der Liste";
    meta.textContent = activeList
      ? "Fuege den ersten Artikel zu dieser Einkaufsliste hinzu."
      : "Fangt mit eurem ersten Eintrag an.";
    content.append(title, meta);
    emptyState.append(spacer, content);
    shoppingList.append(emptyState);
    return;
  }

  const openItems = visibleItems.filter((item) => !item.checked);
  const completedItems = visibleItems.filter((item) => item.checked);

  if (openItems.length > 0) {
    const openHeading = document.createElement("li");
    openHeading.className = "section-heading";

    const openTitle = document.createElement("p");
    openTitle.className = "section-heading-title";
    openTitle.textContent = "Offen";

    const openCopy = document.createElement("span");
    openCopy.className = "section-heading-copy";
    openCopy.textContent = `${openItems.length} offen`;

    openHeading.append(openTitle, openCopy);
    shoppingList.append(openHeading);
    appendCategoryGroups(openItems);
  }

  if (completedItems.length > 0) {
    const completedHeading = document.createElement("li");
    completedHeading.className = "section-heading";

    const completedTitle = document.createElement("p");
    completedTitle.className = "section-heading-title";
    completedTitle.textContent = "Erledigt";

    const completedActions = document.createElement("div");
    completedActions.className = "section-heading-actions";

    const completedCopy = document.createElement("span");
    completedCopy.className = "section-heading-copy";
    completedCopy.textContent = `${completedItems.length} erledigt`;

    const collapseButton = document.createElement("button");
    collapseButton.className = "collapse-button";
    collapseButton.type = "button";
    collapseButton.textContent = completedCollapsed ? "Einblenden" : "Einklappen";
    collapseButton.addEventListener("click", () => {
      completedCollapsed = !completedCollapsed;
      renderItems(currentItems);
    });

    const clearCompletedButton = document.createElement("button");
    clearCompletedButton.className = "clear-completed-button";
    clearCompletedButton.type = "button";
    clearCompletedButton.textContent = "Alle erledigten löschen";
    clearCompletedButton.addEventListener("click", async () => {
      const shouldDelete = window.confirm("Willst du wirklich alle erledigten Artikel löschen?");
      if (!shouldDelete) {
        return;
      }

      await Promise.all(
        completedItems.map((item) => deleteDoc(doc(db, "items", item.id))),
      );
    });

    completedActions.append(completedCopy, collapseButton, clearCompletedButton);
    completedHeading.append(completedTitle, completedActions);
    shoppingList.append(completedHeading);

    if (!completedCollapsed) {
      for (const item of completedItems) {
        shoppingList.append(buildItemRow(item));
      }
    }
  }
}

function renderPendingUsers(users) {
  pendingUsers.innerHTML = "";
  pendingCount.textContent = `${users.length} offen`;

  if (users.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "item-row";
    const spacer = document.createElement("div");
    const content = document.createElement("div");
    const title = document.createElement("p");
    const meta = document.createElement("p");
    title.className = "item-name";
    meta.className = "item-meta";
    title.textContent = "Keine offenen Freigaben";
    meta.textContent = "Neue Anmeldungen erscheinen hier automatisch.";
    content.append(title, meta);
    emptyState.append(spacer, content);
    pendingUsers.append(emptyState);
    return;
  }

  for (const user of users) {
    const row = document.createElement("li");
    row.className = "pending-row";

    const content = document.createElement("div");
    const title = document.createElement("p");
    const meta = document.createElement("p");
    title.className = "item-name";
    meta.className = "item-meta";
    title.textContent = user.name || user.email || "Unbekannter Nutzer";
    meta.textContent = user.email || "Keine E-Mail";
    content.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "pending-actions";

    const approveButton = document.createElement("button");
    approveButton.className = "secondary-button";
    approveButton.type = "button";
    approveButton.textContent = "Freigeben";
    approveButton.addEventListener("click", async () => {
      await updateDoc(doc(db, "users", user.id), {
        approvalStatus: "approved",
        approvedBy: auth.currentUser?.email || "admin",
        updatedAt: serverTimestamp(),
      });
    });

    const rejectButton = document.createElement("button");
    rejectButton.className = "danger-button";
    rejectButton.type = "button";
    rejectButton.textContent = "Ablehnen";
    rejectButton.addEventListener("click", async () => {
      await updateDoc(doc(db, "users", user.id), {
        approvalStatus: "rejected",
        approvedBy: auth.currentUser?.email || "admin",
        updatedAt: serverTimestamp(),
      });
    });

    actions.append(approveButton, rejectButton);
    row.append(content, actions);
    pendingUsers.append(row);
  }
}

function listenForPendingUsers() {
  stopPendingUsersListener();

  const pendingQuery = query(collection(db, "users"), where("approvalStatus", "==", "pending"));

  unsubscribePendingUsers = onSnapshot(
    pendingQuery,
    (snapshot) => {
      const users = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data(),
      }));
      renderPendingUsers(users);
    },
    (error) => {
      setMessage(
        appMessage,
        error instanceof Error ? error.message : "Die Freigabeliste konnte nicht geladen werden.",
        true,
      );
    },
  );
}

function listenForShoppingLists(householdId, user) {
  stopListsListener();

  const listsQuery = query(
    collection(db, "shoppingLists"),
    where("householdId", "==", householdId),
  );

  unsubscribeLists = onSnapshot(
    listsQuery,
    async (snapshot) => {
      currentShoppingLists = snapshot.docs
        .map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }))
        .sort((left, right) => {
          if (left.isDefault && !right.isDefault) {
            return -1;
          }
          if (!left.isDefault && right.isDefault) {
            return 1;
          }
          return (left.name || "").localeCompare(right.name || "", "de");
        });

      if (currentShoppingLists.length === 0) {
        await ensureDefaultShoppingList(user);
        return;
      }

      if (!currentShoppingLists.some((entry) => entry.id === activeListId)) {
        activeListId = currentShoppingLists[0].id;
      }

      renderListSelector();
      renderItems(currentItems);
    },
    (error) => {
      setMessage(
        appMessage,
        error instanceof Error ? error.message : "Die Einkaufslisten konnten nicht geladen werden.",
        true,
      );
    },
  );
}

function listenForItems(householdId) {
  stopItemsListener();

  const itemsQuery = query(collection(db, "items"), where("householdId", "==", householdId));

  unsubscribeItems = onSnapshot(
    itemsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }))
        .sort((left, right) => {
          const leftMs = left.createdAt?.toMillis ? left.createdAt.toMillis() : 0;
          const rightMs = right.createdAt?.toMillis ? right.createdAt.toMillis() : 0;
          return rightMs - leftMs;
        });

      clearMessage(appMessage);
      renderItems(items);
    },
    (error) => {
      setMessage(
        appMessage,
        error instanceof Error ? error.message : "Die Einkaufsliste konnte nicht geladen werden.",
        true,
      );
    },
  );
}

function showAuthenticatedUI(user) {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  userName.textContent = user.displayName || user.email || "Eingeloggt";
  userAvatar.src =
    user.photoURL ||
    "https://api.dicebear.com/9.x/initials/svg?seed=Haushalt&backgroundType=gradientLinear";
}

function showSignedOutUI() {
  authView.classList.remove("hidden");
  appView.classList.add("hidden");
  viewSwitcher?.classList.add("hidden");
  approvalPanel?.classList.add("hidden");
  adminPanel?.classList.add("hidden");
  createHouseholdForm?.classList.add("hidden");
  joinHouseholdForm?.classList.add("hidden");
  itemForm?.classList.add("hidden");
  invitePanel?.classList.add("hidden");
  listsPanel?.classList.add("hidden");
  listPanel?.classList.add("hidden");
  stopItemsListener();
  stopPendingUsersListener();
  stopListsListener();
  currentShoppingLists = [];
  activeListId = null;
  currentItems = [];
  currentHouseholdId = null;
  activeView = "shopping";
  googleCalendarAccessToken = "";
  googleCalendarCalendars = [];
  setCalendarConnectionState(false);
  renderCalendarSources();
  renderCalendarEvents([]);
  clearMessage(calendarMessage);
  renderActiveView();
  clearMessage(appMessage);
}

async function handleSignedInUser(user) {
  showAuthenticatedUI(user);
  clearMessage(authMessage);

  try {
    await ensureUserProfile(user);
    await syncHouseholdState(user);
  } catch (error) {
    setMessage(
      appMessage,
      error instanceof Error ? error.message : "Daten konnten nicht geladen werden.",
      true,
    );
  }
}

async function syncHouseholdState(user) {
  const profile = await getUserProfile(user.uid);
  const householdId = profile?.householdId;
  const isApproved = profile?.approvalStatus === "approved";
  const isAdmin = profile?.role === "admin";
  const wasPreviouslyApproved = sessionStorage.getItem("approval_seen") === "true";

  viewSwitcher?.classList.toggle("hidden", !isApproved);
  approvalPanel?.classList.toggle("hidden", isApproved);
  adminPanel?.classList.toggle("hidden", !isAdmin);

  if (isAdmin) {
    listenForPendingUsers();
  } else {
    stopPendingUsersListener();
  }

  if (!isApproved) {
    sessionStorage.removeItem("approval_seen");
    createHouseholdForm?.classList.add("hidden");
    joinHouseholdForm?.classList.add("hidden");
    itemForm?.classList.add("hidden");
    invitePanel?.classList.add("hidden");
    listsPanel?.classList.add("hidden");
    listPanel?.classList.add("hidden");
    stopItemsListener();
    stopListsListener();
    householdName.textContent = "Freigabe ausstehend";
    inviteCode.textContent = "-";
    shoppingList.innerHTML = "";
    itemCount.textContent = "0 Artikel";
    activeView = "shopping";
    renderActiveView();
    setMessage(
      appMessage,
      profile?.approvalStatus === "rejected"
        ? "Diese Anmeldung wurde abgelehnt."
        : "Neue Anmeldung muss erst bestaetigt werden.",
      profile?.approvalStatus === "rejected",
    );
    return;
  }

  if (!wasPreviouslyApproved && !isAdmin) {
    setMessage(
      appMessage,
      "Du wurdest freigegeben. Du kannst jetzt dem Haushalt beitreten oder einen neuen anlegen.",
    );
    sessionStorage.setItem("approval_seen", "true");
  }

  createHouseholdForm?.classList.toggle("hidden", Boolean(householdId));
  joinHouseholdForm?.classList.toggle("hidden", Boolean(householdId));
  itemForm?.classList.toggle("hidden", !householdId);
  invitePanel?.classList.toggle("hidden", !householdId);
  listsPanel?.classList.toggle("hidden", !householdId);
  listPanel?.classList.toggle("hidden", !householdId);

  if (!householdId) {
    householdName.textContent = "Noch kein Haushalt";
    inviteCode.textContent = "-";
    shoppingList.innerHTML = "";
    itemCount.textContent = "0 Artikel";
    stopItemsListener();
    stopListsListener();
    currentHouseholdId = null;
    activeListId = null;
    currentShoppingLists = [];
    setMessage(
      appMessage,
      "Erstelle einen Haushalt oder trete mit einem Code bei, damit ihr gemeinsam einkaufen könnt.",
    );
    renderActiveView();
    return;
  }

  const householdSnapshot = await getDoc(doc(db, "households", householdId));
  if (!householdSnapshot.exists()) {
    setMessage(appMessage, "Der verknüpfte Haushalt wurde nicht gefunden.", true);
    return;
  }

  const household = householdSnapshot.data();
  currentHouseholdId = householdId;
  activeListId = household.activeListId || "";
  householdName.textContent = household.name;
  inviteCode.textContent = household.code;
  clearMessage(appMessage);
  listenForShoppingLists(householdId, user);
  listenForItems(householdId);
  renderActiveView();
}

loginButton.addEventListener("click", async () => {
  clearMessage(authMessage);

  try {
    const prefersRedirect =
      window.matchMedia("(max-width: 720px)").matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (prefersRedirect) {
      setMessage(authMessage, "Ich leite dich zum Google-Login weiter...");
      await signInWithRedirect(auth, provider);
      return;
    }

    await signInWithPopup(auth, provider);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const popupIssue =
      message.includes("popup") ||
      message.includes("operation-not-supported-in-this-environment") ||
      message.includes("auth/unauthorized-domain");

    if (popupIssue) {
      setMessage(
        authMessage,
        "Popup-Login klappt hier nicht. Ich leite dich stattdessen zum Google-Login weiter...",
      );
      await signInWithRedirect(auth, provider);
      return;
    }

    setMessage(authMessage, message || "Login fehlgeschlagen.", true);
  }
});

shoppingViewButton?.addEventListener("click", () => {
  activeView = "shopping";
  renderActiveView();
});

calendarViewButton?.addEventListener("click", () => {
  activeView = "calendar";
  renderActiveView();
});

connectCalendarButton?.addEventListener("click", async () => {
  clearMessage(calendarMessage);

  try {
    await requestGoogleCalendarAccess();
    await loadGoogleCalendarEvents();
  } catch (error) {
    setMessage(
      calendarMessage,
      error instanceof Error ? error.message : "Google Kalender konnte nicht verbunden werden.",
      true,
    );
  }
});

refreshCalendarButton?.addEventListener("click", async () => {
  await loadGoogleCalendarEvents();
});

calendarRangeSelect?.addEventListener("change", async () => {
  await loadGoogleCalendarEvents();
});

calendarSourceSelect?.addEventListener("change", async () => {
  await loadGoogleCalendarEvents();
});

emailLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(authMessage);

  try {
    await signInWithEmailAndPassword(
      auth,
      emailLoginInput.value.trim(),
      emailLoginPassword.value,
    );
    emailLoginPassword.value = "";
  } catch (error) {
    setMessage(authMessage, formatAuthError(error), true);
  }
});

emailRegisterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(authMessage);

  const name = registerNameInput.value.trim();
  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value;

  try {
    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(credentials.user, { displayName: name });
    }
    await ensureUserProfile(auth.currentUser || credentials.user);

    registerNameInput.value = "";
    registerEmailInput.value = "";
    registerPasswordInput.value = "";
    setMessage(
      authMessage,
      "Registrierung erfolgreich. Die neue Anmeldung wartet jetzt auf Freigabe.",
    );
  } catch (error) {
    setMessage(authMessage, formatAuthError(error), true);
  }
});

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
});

copyCodeButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(inviteCode.textContent || "");
    setMessage(appMessage, "Code in die Zwischenablage kopiert.");
  } catch {
    setMessage(appMessage, "Code konnte nicht kopiert werden.", true);
  }
});

listSelect.addEventListener("change", async () => {
  activeListId = listSelect.value;
  renderItems(currentItems);

  if (!currentHouseholdId) {
    return;
  }

  await updateDoc(doc(db, "households", currentHouseholdId), {
    activeListId,
  });
});

newListButton.addEventListener("click", () => {
  openListEditor();
});

editListButton.addEventListener("click", () => {
  const activeList = getActiveShoppingList();
  if (!activeList) {
    return;
  }

  openListEditor(activeList);
});

cancelListButton.addEventListener("click", () => {
  resetListEditor();
});

listEditor.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;
  if (!user || !currentHouseholdId) {
    return;
  }

  const cleanedName = listNameInput.value.trim();
  if (!cleanedName) {
    setMessage(appMessage, "Bitte gib einen Listennamen ein.", true);
    return;
  }

  const payload = {
    categoryOrder: editingListOrder,
    name: cleanedName,
    updatedAt: serverTimestamp(),
  };

  if (editingListId) {
    await updateDoc(doc(db, "shoppingLists", editingListId), payload);
    activeListId = editingListId;
  } else {
    const listRef = await addDoc(collection(db, "shoppingLists"), {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      householdId: currentHouseholdId,
      isDefault: false,
    });
    activeListId = listRef.id;
  }

  await updateDoc(doc(db, "households", currentHouseholdId), {
    activeListId,
  });

  resetListEditor();
});

createHouseholdForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(appMessage);

  const user = auth.currentUser;
  if (!user) {
    return;
  }

  try {
    await createHousehold(user, householdInput.value.trim());
    householdInput.value = "";
    await syncHouseholdState(user);
  } catch (error) {
    setMessage(
      appMessage,
      error instanceof Error ? error.message : "Haushalt konnte nicht erstellt werden.",
      true,
    );
  }
});

joinHouseholdForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(appMessage);

  const user = auth.currentUser;
  if (!user) {
    return;
  }

  try {
    await joinHousehold(user, joinCodeInput.value);
    joinCodeInput.value = "";
    await syncHouseholdState(user);
  } catch (error) {
    setMessage(
      appMessage,
      error instanceof Error ? error.message : "Beitritt fehlgeschlagen.",
      true,
    );
  }
});

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(appMessage);

  const user = auth.currentUser;
  if (!user) {
    return;
  }

  const profile = await getUserProfile(user.uid);
  if (!profile?.householdId) {
    setMessage(appMessage, "Bitte zuerst einen Haushalt verbinden.", true);
    return;
  }

  if (!activeListId) {
    setMessage(appMessage, "Bitte warte kurz, bis die Einkaufslisten geladen sind.", true);
    return;
  }

  const cleanedItemName = itemInput.value.trim();
  const cleanedQuantity = quantityInput.value.trim();
  const selectedCategory = categoryInput.value;
  if (!cleanedItemName) {
    setMessage(appMessage, "Bitte gib einen Artikelnamen ein.", true);
    return;
  }

  try {
    await addDoc(collection(db, "items"), {
      category: selectedCategory || "Allgemein",
      checked: false,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      createdByName: user.displayName || user.email || "Unbekannt",
      householdId: profile.householdId,
      listId: activeListId,
      name: cleanedItemName,
      quantity: cleanedQuantity || "1x",
      updatedAt: serverTimestamp(),
    });
    itemInput.value = "";
    quantityInput.value = "";
    categoryInput.value = "Allgemein";
  } catch (error) {
    setMessage(
      appMessage,
      error instanceof Error ? error.message : "Eintrag konnte nicht gespeichert werden.",
      true,
    );
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showSignedOutUI();
    return;
  }

  await handleSignedInUser(user);
});

async function initializeAuth() {
  try {
    setCalendarConnectionState(false);
    renderCalendarSources();
    renderCalendarEvents([]);
    renderActiveView();

    await setPersistence(auth, browserLocalPersistence);
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      await handleSignedInUser(redirectResult.user);
    }

    if (ensureGoogleCalendarConfigured()) {
      initializeGoogleCalendar().catch(() => {
        setMessage(
          calendarMessage,
          "Google Kalender konnte noch nicht initialisiert werden.",
          true,
        );
      });
    } else {
      setMessage(
        calendarMessage,
        "Google Kalender ist vorbereitet. Es fehlen nur noch API-Key und OAuth-Client-ID in der Konfiguration.",
      );
    }
  } catch (error) {
    setMessage(
      authMessage,
      error instanceof Error ? error.message : "Redirect-Login fehlgeschlagen.",
      true,
    );
  }
}

await initializeAuth();
