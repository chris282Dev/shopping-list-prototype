import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
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
import { firebaseConfig } from "./firebase-config.js";

const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const authMessage = document.querySelector("#auth-message");
const appMessage = document.querySelector("#app-message");
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

function setMessage(target, message, isError = false) {
  target.textContent = message;
  target.style.color = isError ? "var(--danger)" : "";
}

function clearMessage(target) {
  target.textContent = "";
  target.style.color = "";
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

function buildCategoryOptions(selectedValue) {
  return CATEGORY_OPTIONS.map((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = category === selectedValue;
    return option;
  });
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
      name: user.displayName,
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
    await setPersistence(auth, browserLocalPersistence);
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      await handleSignedInUser(redirectResult.user);
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
