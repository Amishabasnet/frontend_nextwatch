import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Search, Users as UsersIcon, ShieldCheck, Shield, Ban, CheckCircle2,
  Trash2, AlertCircle, ChevronLeft, ChevronRight, UserPlus, X, Check,
  Loader2, Eye, EyeOff,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  getAdminUsers, createAdminUser, updateAdminUserRole, updateAdminUserStatus, deleteAdminUser,
} from "../../services/api";
import ConfirmDialog from "./ConfirmDialog";
import "./Admin.css";

const EMPTY_ADMIN_FORM = { name: "", email: "", phone: "", password: "" };
const PHONE_REGEX = /^[+]?[\d\s()-]{7,15}$/;

function CreateAdminModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_ADMIN_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setFormError("Enter a valid email."); return; }
    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {
      setFormError("Enter a valid phone number.");
      return;
    }
    if (form.password.length < 6) { setFormError("Password must be at least 6 characters."); return; }

    setSaving(true);
    setFormError("");
    try {
      const res = await createAdminUser({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      toast.success(`${res.data?.name ?? form.name} was created as an admin.`);
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Couldn't create admin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose} role="presentation">
      <form className="adm-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="adm-modal-header">
          <h2 className="adm-modal-title">Create Admin Account</h2>
          <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {formError && (
          <div className="adm-error"><AlertCircle size={14} /><span>{formError}</span></div>
        )}

        <label className="adm-field">
          <span className="adm-field-label">Full name *</span>
          <input className="adm-input" value={form.name} onChange={set("name")} placeholder="Jane Doe" />
        </label>

        <label className="adm-field">
          <span className="adm-field-label">Email *</span>
          <input className="adm-input" type="email" value={form.email} onChange={set("email")} placeholder="admin@example.com" />
        </label>

        <label className="adm-field">
          <span className="adm-field-label">Phone (optional)</span>
          <input className="adm-input" type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 234 567 8900" />
        </label>

        <label className="adm-field">
          <span className="adm-field-label">Temporary password *</span>
          <div style={{ position: "relative" }}>
            <input
              className="adm-input"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder="Min. 6 characters"
              style={{ paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#6b6b8a", cursor: "pointer",
                display: "flex", padding: 4,
              }}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>

        <div className="adm-modal-footer">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Create admin
          </button>
        </div>
      </form>
    </div>
  );
}

function formatDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

export default function AdminUsersPage() {
  const { adminUser } = useOutletContext() ?? {};
  const currentUserId = adminUser?.id ?? adminUser?._id;

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await getAdminUsers(params);
      setUsers(res.data?.users ?? []);
      setMeta(res.data?.meta ?? { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message ?? "Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const withBusy = async (id, fn) => {
    setBusyIds((s) => new Set(s).add(id));
    try {
      await fn();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Action failed.");
    } finally {
      setBusyIds((s) => { const next = new Set(s); next.delete(id); return next; });
    }
  };

  const toggleRole = (u) =>
    withBusy(u.id, async () => {
      const nextRole = u.role === "admin" ? "user" : "admin";
      await updateAdminUserRole(u.id, nextRole);
      toast.success(`${u.name} is now ${nextRole}`);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
    });

  const toggleStatus = (u) =>
    withBusy(u.id, async () => {
      const nextStatus = u.status === "suspended" ? "active" : "suspended";
      await updateAdminUserStatus(u.id, nextStatus);
      toast.success(nextStatus === "suspended" ? `${u.name} suspended` : `${u.name} reactivated`);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status: nextStatus } : x)));
    });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteTarget.id);
      toast.success("User deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Couldn't delete user.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Manage Users</h1>
          <p className="adm-page-subtitle">{meta.total ?? users.length} registered accounts</p>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus size={14} /> Add Admin
        </button>
      </div>

      <div className="adm-panel">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={15} />
            <input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="adm-select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select className="adm-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {error && <div className="adm-error"><AlertCircle size={14} /><span>{error}</span></div>}

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="adm-skel-row">
                    <td><div className="adm-skel" style={{ width: 180, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 60, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 60, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 80, height: 14 }} /></td>
                    <td></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5}><div className="adm-empty"><UsersIcon size={20} style={{ marginBottom: 6 }} /><div>No users found.</div></div></td></tr>
              ) : (
                users.map((u) => {
                  const isSelf = String(u.id) === String(currentUserId);
                  const isBusy = busyIds.has(u.id);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="adm-row-title">
                          <div
                            style={{
                              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.66rem", fontWeight: 800, color: "#fff",
                              background: "linear-gradient(135deg, #8b5cf6 0%, #2563eb 100%)",
                            }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div className="adm-cell-title">{u.name}{isSelf && <span style={{ color: "#6b6b8a", fontWeight: 500 }}> (you)</span>}</div>
                            <div className="adm-cell-sub">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`adm-badge adm-badge--${u.role === "admin" ? "admin" : "user"}`}>
                          {u.role === "admin" ? <ShieldCheck size={11} /> : <Shield size={11} />}
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-badge adm-badge--${u.status === "suspended" ? "suspended" : "active"}`}>
                          {u.status === "suspended" ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="adm-cell-sub">{formatDate(u.createdAt)}</td>
                      <td>
                        <div className="adm-table-actions">
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost adm-btn--sm"
                            disabled={isSelf || isBusy}
                            title={isSelf ? "You can't change your own role" : "Toggle admin role"}
                            onClick={() => toggleRole(u)}
                          >
                            {u.role === "admin" ? <Shield size={12} /> : <ShieldCheck size={12} />}
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost adm-btn--sm"
                            disabled={isSelf || isBusy}
                            title={isSelf ? "You can't suspend your own account" : (u.status === "suspended" ? "Reactivate" : "Suspend")}
                            onClick={() => toggleStatus(u)}
                          >
                            {u.status === "suspended" ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn--danger adm-btn--sm"
                            disabled={isSelf}
                            title={isSelf ? "You can't delete your own account" : "Delete user"}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && meta.totalPages > 1 && (
          <div className="adm-pagination">
            <span>Page {meta.page} of {meta.totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="adm-btn adm-btn--ghost adm-btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost adm-btn--sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateAdminModal
          onClose={() => setCreateOpen(false)}
          onCreated={load}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete user?"
          message={`This permanently deletes "${deleteTarget.name}" and all of their data (history, ratings, watchlist, preferences).`}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
