/* =======================================================================
   roles.js — shared "roles" permission system for the internal admin
   pages: admin-quotations.html, products.html, users.html.

   Two Firestore collections are involved:

     roles/{roleId} = {
       name: "اسم الدور",
       pages: {
         quotationAdmin: { read: bool, edit: bool },   // admin-quotations.html
         products:       { read: bool, edit: bool },   // products.html
         users:          { read: bool, edit: bool },   // users.html
       },
       createdAt, updatedAt
     }

     users/{uid} = { email, roleId, createdAt, updatedAt }
       — one doc per signed-in user, keyed by their Firebase Auth UID,
         pointing at a roles/{roleId} doc.

   Two baseline roles are expected to exist with FIXED ids "view" and
   "edit" — see DEFAULT_ROLES below. Anyone signed in but pointing at a
   role/page combo with read:false sees "no access" on that page; edit:false
   means read-only (inputs locked, save/add/delete controls hidden).

   Bootstrapping (one-time, manual — this app has no backend, so nothing
   here can safely self-promote without opening a privilege-escalation
   hole): open the Firebase console → Firestore, and:
     1) create roles/view  and roles/edit  with the exact shape in
        DEFAULT_ROLES below (or use the "إعادة إنشاء الأدوار الافتراضية"
        button in users.html once an editor already exists — but the
        very first editor still needs this doc to exist to log in with
        edit rights, so do it by hand once).
     2) create/edit users/{your-uid} and set roleId to "edit".
   After that, anyone with users-page edit rights can manage roles and
   users entirely from users.html — no more console visits needed.
   ======================================================================= */

import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const PAGE_QUOTATIONS = "quotationAdmin";
export const PAGE_PRODUCTS = "products";
export const PAGE_USERS = "users";
export const ALL_PAGES = [PAGE_QUOTATIONS, PAGE_PRODUCTS, PAGE_USERS];

export const PAGE_LABELS = {
  [PAGE_QUOTATIONS]: "عروض الأسعار",
  [PAGE_PRODUCTS]: "المنتجات والأسعار",
  [PAGE_USERS]: "المستخدمون والصلاحيات",
};

function blankPages(read, edit){
  return {
    [PAGE_QUOTATIONS]: { read, edit },
    [PAGE_PRODUCTS]: { read, edit },
    [PAGE_USERS]: { read, edit },
  };
}

// the two baseline roles — fixed doc ids "view" and "edit"
export const DEFAULT_ROLES = {
  view: { name: "عرض فقط (كل الصفحات)", pages: blankPages(true, false) },
  edit: { name: "عرض وتعديل (كل الصفحات)", pages: blankPages(true, true) },
};

// ---------------------------------------------------------------------
// Roles collection
// ---------------------------------------------------------------------

export async function fetchAllRoles(db){
  const snap = await getDocs(collection(db, "roles"));
  const roles = [];
  snap.forEach(d=> roles.push({ id: d.id, ...d.data() }));
  roles.sort((a,b)=> (a.name||"").localeCompare(b.name||""));
  return roles;
}

export async function fetchRole(db, roleId){
  if(!roleId) return null;
  const snap = await getDoc(doc(db, "roles", roleId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createRole(db, { name, pages }){
  const ref = doc(collection(db, "roles"));
  await setDoc(ref, { name, pages, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateRole(db, roleId, { name, pages }){
  await updateDoc(doc(db, "roles", roleId), { name, pages, updatedAt: serverTimestamp() });
}

export async function deleteRole(db, roleId){
  await deleteDoc(doc(db, "roles", roleId));
}

// best-effort: (re)creates the two baseline roles/view + roles/edit docs.
// Only succeeds if the caller already has users-page edit rights (per
// Firestore rules) — this is a convenience for resetting them if deleted,
// not a way to bootstrap the very first admin (see module docblock above).
export async function seedDefaultRoles(db){
  for(const [id, data] of Object.entries(DEFAULT_ROLES)){
    await setDoc(doc(db, "roles", id), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

export function permissionFor(role, pageKey){
  const p = role?.pages?.[pageKey];
  return { read: !!p?.read, edit: !!p?.edit };
}

// ---------------------------------------------------------------------
// Users collection
// ---------------------------------------------------------------------

// Ensures users/{uid} exists (self-registers with the default "view" role
// the first time this person ever signs in to any admin page). Returns
// the profile { id, email, roleId, ... }.
export async function ensureUserProfile(db, user){
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if(snap.exists()) return { id: user.uid, ...snap.data() };
  const profile = { email: user.email || "", roleId: "view", createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(ref, profile);
  return { id: user.uid, ...profile };
}

// Used by users.html's "add new user" flow: after the new Firebase Auth
// account is created (see the secondary-app trick there), an editor
// creates that person's profile doc directly with whatever role was
// picked — unlike ensureUserProfile, which always defaults to "view"
// for someone self-registering on their own first login.
export async function createUserDoc(db, uid, email, roleId){
  await setDoc(doc(db, "users", uid), {
    email: email || "",
    roleId: roleId || "view",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchAllUsers(db){
  const snap = await getDocs(collection(db, "users"));
  const users = [];
  snap.forEach(d=> users.push({ id: d.id, ...d.data() }));
  users.sort((a,b)=> (a.email||"").localeCompare(b.email||""));
  return users;
}

export async function setUserRole(db, uid, roleId){
  await updateDoc(doc(db, "users", uid), { roleId, updatedAt: serverTimestamp() });
}

// Signed-in user's permission on ONE page — what each admin page actually
// needs on load. Ensures their profile exists, looks up their role, and
// returns {read, edit, role, profile}. Missing/unknown role => deny-all.
export async function getMyPermission(db, user, pageKey){
  const profile = await ensureUserProfile(db, user);
  const role = await fetchRole(db, profile.roleId);
  return { ...permissionFor(role, pageKey), role, profile };
}

// Reflects capability on <body> via classes so CSS can gate the UI:
//   body.can-edit   — edit:true on this page
//   body.read-only  — read:true but edit:false
//   body.no-access  — read:false (caller should show a "no access" panel
//                      and skip loading page data entirely)
export function applyPermissionBodyClass(perm){
  document.body.classList.toggle("can-edit", !!perm.edit);
  document.body.classList.toggle("read-only", !!perm.read && !perm.edit);
  document.body.classList.toggle("no-access", !perm.read);
}

export function roleLabel(role){
  return role?.name || "بدون صلاحية";
}
