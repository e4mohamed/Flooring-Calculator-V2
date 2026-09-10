/* =======================================================================
   roles.js — shared two-tier role system (view / edit) for the internal
   admin pages: admin-quotations.html, products.html, users.html.

   Roles live in the "users" Firestore collection, one document per
   signed-in user, keyed by their Firebase Auth UID:

     users/{uid} = { email, role: "view" | "edit", createdAt, updatedAt }

   "view"  — can sign in and open these admin pages, and see everything,
             but cannot save, edit, or delete anything.
   "edit"  — full access: can also save/edit/delete, and can change other
             users' roles from the Users page.

   The quotation page itself (quotation.html) is NOT gated by this system
   at all — anyone can use it to create/print a quote, per design.

   Bootstrapping: the FIRST person ever to sign in to any admin page gets
   "view" by default (see ensureUserProfile below) — there is no
   automatic first "edit" user, since nothing here runs with elevated
   (admin SDK) privileges. To promote the first real admin, open the
   Firebase console → Firestore → users/{their uid} and change role to
   "edit" by hand, once. After that, anyone with "edit" can promote
   others from users.html.
   ======================================================================= */

import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const ROLE_VIEW = "view";
export const ROLE_EDIT = "edit";

export function roleLabel(role){
  if(role === ROLE_EDIT) return "عرض وتعديل";
  if(role === ROLE_VIEW) return "عرض فقط";
  return "بدون صلاحية";
}

export function canEdit(role){
  return role === ROLE_EDIT;
}

export function canView(role){
  return role === ROLE_VIEW || role === ROLE_EDIT;
}

// Fetches this user's role document, creating it (defaulted to "view")
// the first time they ever sign in to any admin page. Returns the role
// string ("view" or "edit").
export async function ensureUserProfile(db, user){
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if(snap.exists()){
    return snap.data().role || ROLE_VIEW;
  }
  await setDoc(ref, {
    email: user.email || "",
    role: ROLE_VIEW,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ROLE_VIEW;
}

// Applies the "role-view" / "role-edit" class to <body> so CSS rules like
// ".role-view .needs-edit{display:none}" can hide edit-only controls.
export function applyRoleBodyClass(role){
  document.body.classList.remove("role-view", "role-edit");
  document.body.classList.add(role === ROLE_EDIT ? "role-edit" : "role-view");
}
