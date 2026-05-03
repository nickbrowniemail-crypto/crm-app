import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIG: Yahan apni Supabase keys daalo ──────────────────
const SUPABASE_URL = "https://lxnioekekombeoxdhklg.supabase.co";        // e.g. https://abc.supabase.co
const SUPABASE_ANON_KEY = "sb_publishable_bavgPR7ZrDeeNVTh69Kkmw_Oi6ZXe-2"; // Project Settings > API
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const STATUS_COLORS = {
  Confirmed: "#f0c040", "In Progress": "#4db8ff",
  Completed: "#4ddd88", Cancelled: "#ff6b6b",
  Paid: "#4ddd88", Pending: "#f0c040", Delivered: "#4ddd88",
};

export default function App() {
  const [user, setUser] = useState(localStorage.getItem("user") || "");
   const [newTask, setNewTask] = useState("");
    const [newDel, setNewDel] = useState("");
    const [editPaid, setEditPaid] = useState(false);
    const [paidVal, setPaidVal] = useState(0);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // ── LOAD ALL DATA ──────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, v, vp, t, d] = await Promise.all([
        supabase.from("projects").select("*").order("wedding_date"),
        supabase.from("vendors").select("*").order("name"),
        supabase.from("vendor_payments").select("*").order("payment_date", { ascending: false }),
        supabase.from("tasks").select("*"),
        supabase.from("deliverables").select("*"),
      ]);
      setProjects(p.data || []);
      setVendors(v.data || []);
      setPayments(vp.data || []);
      setTasks(t.data || []);
      setDeliverables(d.data || []);
    } catch (e) {
      showToast("Data load failed: " + e.message, "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const withSave = async (fn) => {
    setSaving(true);
    try { await fn(); await loadAll(); }
    catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  };
  if (!user) {
  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>

      <input
        placeholder="Log in"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            localStorage.setItem("user", e.target.value);
            setUser(e.target.value);
          }
        }}
      />

      <button onClick={() => {
        const name = document.querySelector("input").value;
        localStorage.setItem("user", name);
        setUser(name);
      }}>
        Login
      </button>
    </div>
  );
}

  // ── HELPERS ──────────────────────────────────────────────
  const getProject = id => projects.find(p => p.id === id);
  const getVendor = id => vendors.find(v => v.id === id);
  const projectTasks = pid => tasks.filter(t => t.project_id === pid);
  const projectDeliverables = pid => deliverables.filter(d => d.project_id === pid);
  const projectPayments = pid => payments.filter(vp => vp.project_id === pid);
  const vendorPayments = vid => payments.filter(vp => vp.vendor_id === vid);

  // ── PROJECT ACTIONS ───────────────────────────────────────
  const addProject = (form) => withSave(async () => {
    const { error } = await supabase.from("projects").insert([form]);
    if (error) throw error;
    setModal(null);
    showToast("Project add ho gaya ✓");
  });

  const updateProject = (id, patch) => withSave(async () => {
    const { error } = await supabase.from("projects").update(patch).eq("id", id);
    if (error) throw error;
  });

  const deleteProject = (id) => withSave(async () => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
    setView("projects");
    showToast("Project delete ho gaya");
  });

  // ── TASK ACTIONS ──────────────────────────────────────────
  const addTask = (projectId, title) => withSave(async () => {
    await supabase.from("tasks").insert([{ project_id: projectId, title, done: false }]);
  });

  const toggleTask = (id, done) => withSave(async () => {
    await supabase.from("tasks").update({ done: !done }).eq("id", id);
  });

  const deleteTask = (id) => withSave(async () => {
    await supabase.from("tasks").delete().eq("id", id);
  });

  // ── DELIVERABLE ACTIONS ───────────────────────────────────
  const addDeliverable = (projectId, name) => withSave(async () => {
    await supabase.from("deliverables").insert([{ project_id: projectId, name, status: "Pending" }]);
  });

  const updateDeliverable = (id, status) => withSave(async () => {
    await supabase.from("deliverables").update({ status }).eq("id", id);
  });

  const deleteDeliverable = (id) => withSave(async () => {
    await supabase.from("deliverables").delete().eq("id", id);
  });

  // ── VENDOR ACTIONS ────────────────────────────────────────
  const addVendor = (form) => withSave(async () => {
    await supabase.from("vendors").insert([form]);
    setModal(null);
    showToast("Vendor add ho gaya ✓");
  });

  const deleteVendor = (id) => withSave(async () => {
    await supabase.from("vendors").delete().eq("id", id);
    setView("vendors");
    showToast("Vendor delete ho gaya");
  });

  // ── PAYMENT ACTIONS ───────────────────────────────────────
  const addPayment = (form) => withSave(async () => {
    await supabase.from("vendor_payments").insert([form]);
    setModal(null);
    showToast("Payment save ho gayi ✓");
  });

  const togglePayment = (id, status) => withSave(async () => {
    await supabase.from("vendor_payments").update({ status: status === "Paid" ? "Pending" : "Paid" }).eq("id", id);
  });

  const deletePayment = (id) => withSave(async () => {
    await supabase.from("vendor_payments").delete().eq("id", id);
  });

  // ── STYLES ────────────────────────────────────────────────
  const S = {
    app: { minHeight: "100vh", background: "#0f0f0f", color: "#e8e0d4", fontFamily: "'Georgia', serif", display: "flex" },
    sidebar: { width: 220, background: "#161616", borderRight: "1px solid #2a2a2a", padding: "28px 0", display: "flex", flexDirection: "column", flexShrink: 0 },
    main: { flex: 1, padding: "28px 32px", overflowY: "auto", maxHeight: "100vh" },
    pageTitle: { fontSize: 24, color: "#d4af37", fontStyle: "italic", marginBottom: 24, borderBottom: "1px solid #2a2a2a", paddingBottom: 12 },
    card: { background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: 20, marginBottom: 16 },
    statGrid: (cols = 4) => ({ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14, marginBottom: 20 }),
    stat: { background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: 18 },
    statVal: { fontSize: 26, color: "#d4af37", fontWeight: "bold" },
    statLabel: { fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },
    btn: (v = "primary") => ({ padding: "8px 16px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 12, letterSpacing: 0.5, fontWeight: "bold", background: v === "primary" ? "#d4af37" : v === "danger" ? "#7a1e1e" : "#252525", color: v === "primary" ? "#0f0f0f" : "#e8e0d4" }),
    badge: (st) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, background: (STATUS_COLORS[st] || "#888") + "22", color: STATUS_COLORS[st] || "#888", border: `1px solid ${(STATUS_COLORS[st] || "#888")}44` }),
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", padding: "9px 12px", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #2a2a2a" },
    td: { padding: "11px 12px", fontSize: 13, borderBottom: "1px solid #1a1a1a", verticalAlign: "middle" },
    input: { background: "#0f0f0f", border: "1px solid #333", borderRadius: 5, padding: "8px 12px", color: "#e8e0d4", fontSize: 13, width: "100%", boxSizing: "border-box" },
    select: { background: "#0f0f0f", border: "1px solid #333", borderRadius: 5, padding: "8px 12px", color: "#e8e0d4", fontSize: 13, width: "100%", boxSizing: "border-box" },
    label: { fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" },
    overlay: { position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modalBox: { background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 28, width: 480, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto" },
    link: { color: "#d4af37", cursor: "pointer" },
    navItem: (active) => ({ padding: "10px 24px", cursor: "pointer", fontSize: 13, color: active ? "#d4af37" : "#888", background: active ? "#1e1e1e" : "transparent", borderLeft: active ? "2px solid #d4af37" : "2px solid transparent" }),
    row: { display: "flex", gap: 12, marginBottom: 14 },
  };

  const navActive = (n) => view === n || (n === "projects" && view === "projectDetail") || (n === "vendors" && view === "vendorDetail");

  // ── MODALS ─────────────────────────────────────────────────
  function AddProjectModal() {
    const [f, setF] = useState({ client_name: "", phone: "", email: "", wedding_date: "", location: "", package: "Premium", total_amount: "", status: "Confirmed", notes: "" });
    const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    const valid = f.client_name.trim() && f.wedding_date && f.total_amount;
    return (
      <div style={S.overlay}>
        <div style={S.modalBox}>
          <div style={{ fontSize: 18, color: "#d4af37", marginBottom: 20, fontStyle: "italic" }}>New Wedding Project</div>
          <div style={{ marginBottom: 14 }}><label style={S.label}>Client Names *</label><input style={S.input} value={f.client_name} onChange={upd("client_name")} placeholder="e.g. Priya & Rahul Sharma" /></div>
          <div style={S.row}>
            <div style={{ flex: 1 }}><label style={S.label}>Phone</label><input style={S.input} value={f.phone} onChange={upd("phone")} /></div>
            <div style={{ flex: 1 }}><label style={S.label}>Email</label><input style={S.input} value={f.email} onChange={upd("email")} /></div>
          </div>
          <div style={S.row}>
            <div style={{ flex: 1 }}><label style={S.label}>Wedding Date *</label><input type="date" style={S.input} value={f.wedding_date} onChange={upd("wedding_date")} /></div>
            <div style={{ flex: 1 }}><label style={S.label}>Status</label>
              <select style={S.select} value={f.status} onChange={upd("status")}>
                {["Confirmed", "In Progress", "Completed", "Cancelled"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={S.label}>Venue / Location</label><input style={S.input} value={f.location} onChange={upd("location")} /></div>
          <div style={S.row}>
            <div style={{ flex: 1 }}><label style={S.label}>Package</label>
              <select style={S.select} value={f.package} onChange={upd("package")}>
                {["Basic", "Standard", "Premium", "Elite", "Custom"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><label style={S.label}>Total Amount (₹) *</label><input type="number" style={S.input} value={f.total_amount} onChange={upd("total_amount")} /></div>
          </div>
          <div style={{ marginBottom: 20 }}><label style={S.label}>Notes</label><input style={S.input} value={f.notes} onChange={upd("notes")} placeholder="Kuch special notes..." /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btn("ghost")} onClick={() => setModal(null)}>Cancel</button>
            <button style={{ ...S.btn(), opacity: valid ? 1 : 0.5 }} onClick={() => valid && addProject({ ...f, total_amount: +f.total_amount })}>Create Project</button>
          </div>
        </div>
      </div>
    );
  }

  function AddVendorModal() {
    const [f, setF] = useState({ name: "", phone: "", specialty: "", city: "" });
    const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    return (
      <div style={S.overlay}>
        <div style={S.modalBox}>
          <div style={{ fontSize: 18, color: "#d4af37", marginBottom: 20, fontStyle: "italic" }}>Add Vendor</div>
          <div style={{ marginBottom: 14 }}><label style={S.label}>Naam *</label><input style={S.input} value={f.name} onChange={upd("name")} /></div>
          <div style={S.row}>
            <div style={{ flex: 1 }}><label style={S.label}>Phone</label><input style={S.input} value={f.phone} onChange={upd("phone")} /></div>
            <div style={{ flex: 1 }}><label style={S.label}>City</label><input style={S.input} value={f.city} onChange={upd("city")} /></div>
          </div>
          <div style={{ marginBottom: 20 }}><label style={S.label}>Specialty</label>
            <select style={S.select} value={f.specialty} onChange={upd("specialty")}>
              {["", "Lighting", "Decoration", "Catering", "Makeup", "DJ/Music", "Mehendi", "Transportation", "Printing", "Photo Lab", "Other"].map(s => <option key={s} value={s}>{s || "— Select —"}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btn("ghost")} onClick={() => setModal(null)}>Cancel</button>
            <button style={S.btn()} onClick={() => f.name && addVendor(f)}>Add Vendor</button>
          </div>
        </div>
      </div>
    );
  }

  function AddPaymentModal({ prefillProjectId }) {
    const today = new Date().toISOString().slice(0, 10);
    const [f, setF] = useState({ vendor_id: vendors[0]?.id || "", project_id: prefillProjectId || projects[0]?.id || "", amount: "", status: "Pending", payment_date: today, note: "" });
    const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    return (
      <div style={S.overlay}>
        <div style={S.modalBox}>
          <div style={{ fontSize: 18, color: "#d4af37", marginBottom: 20, fontStyle: "italic" }}>Add Vendor Payment</div>
          {vendors.length === 0 && <div style={{ color: "#ff9944", marginBottom: 14, fontSize: 13 }}>⚠ Pehle koi vendor add karo</div>}
          <div style={{ marginBottom: 14 }}><label style={S.label}>Vendor</label>
            <select style={S.select} value={f.vendor_id} onChange={upd("vendor_id")}>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name} {v.specialty ? `(${v.specialty})` : ""}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}><label style={S.label}>Wedding / Project</label>
            <select style={S.select} value={f.project_id} onChange={upd("project_id")} disabled={!!prefillProjectId}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.client_name} — {p.wedding_date}</option>)}
            </select>
          </div>
          <div style={S.row}>
            <div style={{ flex: 1 }}><label style={S.label}>Amount (₹) *</label><input type="number" style={S.input} value={f.amount} onChange={upd("amount")} /></div>
            <div style={{ flex: 1 }}><label style={S.label}>Date</label><input type="date" style={S.input} value={f.payment_date} onChange={upd("payment_date")} /></div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={S.label}>Status</label>
            <select style={S.select} value={f.status} onChange={upd("status")}><option>Pending</option><option>Paid</option></select>
          </div>
          <div style={{ marginBottom: 20 }}><label style={S.label}>Note</label><input style={S.input} value={f.note} onChange={upd("note")} placeholder="e.g. 50% advance" /></div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btn("ghost")} onClick={() => setModal(null)}>Cancel</button>
            <button style={S.btn()} onClick={() => f.amount && f.vendor_id && addPayment({ ...f, amount: +f.amount })}>Save Payment</button>
          </div>
        </div>
      </div>
    );
  }

  // ── VIEWS ──────────────────────────────────────────────────
  function Dashboard() {
    const upcoming = projects.filter(p => !["Completed", "Cancelled"].includes(p.status)).slice(0, 7);
    const totalRev = projects.reduce((s, p) => s + Number(p.total_amount), 0);
    const collected = projects.reduce((s, p) => s + Number(p.paid_amount), 0);
    const vendorPending = payments.filter(vp => vp.status === "Pending").reduce((s, vp) => s + Number(vp.amount), 0);
    return (
      <>
        <div style={S.pageTitle}>Dashboard</div>
        <div style={S.statGrid(4)}>
          <div style={S.stat}><div style={S.statVal}>{projects.length}</div><div style={S.statLabel}>Total Projects</div></div>
          <div style={S.stat}><div style={S.statVal}>{upcoming.length}</div><div style={S.statLabel}>Active Weddings</div></div>
          <div style={S.stat}><div style={{ ...S.statVal, color: "#4ddd88" }}>₹{(collected / 1000).toFixed(0)}K</div><div style={S.statLabel}>Collected</div></div>
          <div style={S.stat}><div style={{ ...S.statVal, color: "#f0c040" }}>₹{((totalRev - collected) / 1000).toFixed(0)}K</div><div style={S.statLabel}>Client Balance</div></div>
        </div>
        <div style={S.statGrid(2)}>
          <div style={S.stat}><div style={{ ...S.statVal, color: "#ff9944" }}>₹{(vendorPending / 1000).toFixed(0)}K</div><div style={S.statLabel}>Vendor Payments Pending</div></div>
          <div style={S.stat}><div style={S.statVal}>{vendors.length}</div><div style={S.statLabel}>Vendors in Network</div></div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 14, color: "#d4af37", marginBottom: 14, fontStyle: "italic" }}>Upcoming Weddings</div>
          {upcoming.length === 0 ? (
            <div style={{ color: "#555", fontSize: 13, padding: "16px 0" }}>Koi upcoming wedding nahi — <span style={S.link} onClick={() => { setView("projects"); setModal("addProject"); }}>pehla project banao →</span></div>
          ) : (
            <table style={S.table}>
              <thead><tr><th style={S.th}>Client</th><th style={S.th}>Date</th><th style={S.th}>Venue</th><th style={S.th}>Status</th><th style={S.th}>Balance Due</th></tr></thead>
              <tbody>
                {upcoming.map(p => (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => { setSelectedProject(p.id); setView("projectDetail"); }}>
                    <td style={S.td}><span style={S.link}>{p.client_name}</span></td>
                    <td style={S.td}>{p.wedding_date}</td>
                    <td style={S.td}>{p.location || "—"}</td>
                    <td style={S.td}><span style={S.badge(p.status)}>{p.status}</span></td>
                    <td style={{ ...S.td, color: "#ff9944" }}>₹{(p.total_amount - p.paid_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  }

  function Projects() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const filtered = projects.filter(p => {
      const matchS = p.client_name.toLowerCase().includes(search.toLowerCase()) || (p.location || "").toLowerCase().includes(search.toLowerCase());
      const matchF = filter === "All" || p.status === filter;
      return matchS && matchF;
    });
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 24, color: "#d4af37", fontStyle: "italic" }}>Projects ({projects.length})</div>
          <button style={S.btn()} onClick={() => setModal("addProject")}>+ New Project</button>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input style={{ ...S.input, width: 220 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          {["All", "Confirmed", "In Progress", "Completed", "Cancelled"].map(f => (
            <button key={f} style={{ ...S.btn(filter === f ? "primary" : "ghost"), fontSize: 11 }} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        {filtered.length === 0 ? <div style={{ color: "#555", padding: 20 }}>Koi project nahi mila</div> : (
          <div style={S.card}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Client</th><th style={S.th}>Date</th><th style={S.th}>Venue</th>
                  <th style={S.th}>Package</th><th style={S.th}>Status</th>
                  <th style={S.th}>Total</th><th style={S.th}>Paid</th><th style={S.th}>Balance</th><th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={S.td}><span style={S.link} onClick={() => { setSelectedProject(p.id); setView("projectDetail"); }}>{p.client_name}</span></td>
                    <td style={S.td}>{p.wedding_date}</td>
                    <td style={S.td}>{p.location || "—"}</td>
                    <td style={S.td}>{p.package}</td>
                    <td style={S.td}><span style={S.badge(p.status)}>{p.status}</span></td>
                    <td style={S.td}>₹{Number(p.total_amount).toLocaleString()}</td>
                    <td style={{ ...S.td, color: "#4ddd88" }}>₹{Number(p.paid_amount).toLocaleString()}</td>
                    <td style={{ ...S.td, color: p.total_amount > p.paid_amount ? "#ff9944" : "#4ddd88" }}>₹{(p.total_amount - p.paid_amount).toLocaleString()}</td>
                    <td style={S.td}><button style={{ ...S.btn("ghost"), fontSize: 11 }} onClick={() => { setSelectedProject(p.id); setView("projectDetail"); }}>Open →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  function ProjectDetail() {
    const p = getProject(selectedProject);
    if (!p) return null;
    const ptasks = projectTasks(p.id);
    const pdels = projectDeliverables(p.id);
    const ppays = projectPayments(p.id);
    const progress = ptasks.length ? Math.round(ptasks.filter(t => t.done).length / ptasks.length * 100) : 0;
    const delProg = pdels.length ? Math.round(pdels.filter(d => d.status === "Delivered").length / pdels.length * 100) : 0;

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ ...S.link, fontSize: 13 }} onClick={() => setView("projects")}>← Projects</span>
          <div style={{ fontSize: 22, color: "#d4af37", fontStyle: "italic", flex: 1 }}>{p.client_name}</div>
          <select style={{ ...S.select, width: 150 }} value={p.status} onChange={e => updateProject(p.id, { status: e.target.value })}>
            {["Confirmed", "In Progress", "Completed", "Cancelled"].map(st => <option key={st}>{st}</option>)}
          </select>
          <button style={S.btn("danger")} onClick={() => window.confirm("Delete?") && deleteProject(p.id)}>Delete</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 16 }}>
          {[["📅 Date", p.wedding_date], ["📍 Venue", p.location || "—"], ["📦 Package", p.package], ["📞 Phone", p.phone || "—"], ["📧 Email", p.email || "—"]].map(([k, v]) => (
            <div key={k} style={{ ...S.stat, padding: 14 }}><div style={S.statLabel}>{k}</div><div style={{ fontSize: 12, marginTop: 4, color: "#e8e0d4" }}>{v}</div></div>
          ))}
        </div>

        <div style={{ ...S.card, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div><div style={S.statLabel}>Total</div><div style={S.statVal}>₹{Number(p.total_amount).toLocaleString()}</div></div>
          <div style={{ width: 1, background: "#2a2a2a", height: 48 }} />
          <div>
            <div style={S.statLabel}>Received</div>
            {editPaid ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" style={{ ...S.input, width: 130 }} value={paidVal} onChange={e => setPaidVal(+e.target.value)} />
                <button style={S.btn()} onClick={() => { updateProject(p.id, { paid_amount: paidVal }); setEditPaid(false); }}>Save</button>
                <button style={S.btn("ghost")} onClick={() => setEditPaid(false)}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ ...S.statVal, color: "#4ddd88" }}>₹{Number(p.paid_amount).toLocaleString()}</div>
                <button style={{ ...S.btn("ghost"), fontSize: 11 }} onClick={() => setEditPaid(true)}>Edit</button>
              </div>
            )}
          </div>
          <div style={{ width: 1, background: "#2a2a2a", height: 48 }} />
          <div><div style={S.statLabel}>Balance</div><div style={{ ...S.statVal, color: p.total_amount === p.paid_amount ? "#4ddd88" : "#ff9944" }}>₹{(p.total_amount - p.paid_amount).toLocaleString()}</div></div>
          <div style={{ width: 1, background: "#2a2a2a", height: 48 }} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={S.statLabel}>Tasks ({progress}%)</div>
            <div style={{ background: "#2a2a2a", borderRadius: 4, height: 6, marginTop: 6 }}><div style={{ background: "#d4af37", borderRadius: 4, height: 6, width: `${progress}%` }} /></div>
            <div style={{ ...S.statLabel, marginTop: 8 }}>Deliverables ({delProg}%)</div>
            <div style={{ background: "#2a2a2a", borderRadius: 4, height: 6, marginTop: 4 }}><div style={{ background: "#4ddd88", borderRadius: 4, height: 6, width: `${delProg}%` }} /></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={S.card}>
            <div style={{ fontSize: 14, color: "#d4af37", marginBottom: 14, fontStyle: "italic" }}>✅ Tasks</div>
            {ptasks.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id, t.done)} style={{ accentColor: "#d4af37" }} />
                <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? "#555" : "#e8e0d4" }}>{t.title}</span>
                <button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="Naya task..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && newTask && (addTask(p.id, newTask), setNewTask(""))} />
              <button style={S.btn()} onClick={() => { if (newTask) { addTask(p.id, newTask); setNewTask(""); } }}>+</button>
            </div>
          </div>

          <div style={S.card}>
            <div style={{ fontSize: 14, color: "#d4af37", marginBottom: 14, fontStyle: "italic" }}>📦 Deliverables</div>
            {pdels.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                <span style={{ flex: 1, fontSize: 12 }}>{d.name}</span>
                <select style={{ ...S.select, width: 110, padding: "5px 8px", fontSize: 11 }} value={d.status} onChange={e => updateDeliverable(d.id, e.target.value)}>
                  {["Pending", "In Progress", "Delivered"].map(st => <option key={st}>{st}</option>)}
                </select>
                <button onClick={() => deleteDeliverable(d.id)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 15 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="Naya deliverable..." value={newDel} onChange={e => setNewDel(e.target.value)} onKeyDown={e => e.key === "Enter" && newDel && (addDeliverable(p.id, newDel), setNewDel(""))} />
              <button style={S.btn()} onClick={() => { if (newDel) { addDeliverable(p.id, newDel); setNewDel(""); } }}>+</button>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: "#d4af37", fontStyle: "italic" }}>💰 Vendor Payments</div>
            <button style={S.btn()} onClick={() => setModal({ type: "addPayment", projectId: p.id })}>+ Add Payment</button>
          </div>
          {ppays.length === 0 ? <div style={{ color: "#555", fontSize: 13 }}>Koi vendor payment nahi</div> : (
            <table style={S.table}>
              <thead><tr><th style={S.th}>Vendor</th><th style={S.th}>Amount</th><th style={S.th}>Date</th><th style={S.th}>Note</th><th style={S.th}>Status</th><th style={S.th}></th></tr></thead>
              <tbody>
                {ppays.map(vp => (
                  <tr key={vp.id}>
                    <td style={S.td}>{getVendor(vp.vendor_id)?.name || "—"}</td>
                    <td style={S.td}>₹{Number(vp.amount).toLocaleString()}</td>
                    <td style={S.td}>{vp.payment_date || "—"}</td>
                    <td style={{ ...S.td, color: "#888" }}>{vp.note || "—"}</td>
                    <td style={S.td}><span style={S.badge(vp.status)}>{vp.status}</span></td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{ ...S.btn("ghost"), fontSize: 11 }} onClick={() => togglePayment(vp.id, vp.status)}>{vp.status === "Paid" ? "Mark Pending" : "Mark Paid"}</button>
                        <button style={{ ...S.btn("danger"), fontSize: 11 }} onClick={() => deletePayment(vp.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {p.notes && <div style={S.card}><div style={S.statLabel}>Notes</div><div style={{ fontSize: 13, marginTop: 8, color: "#aaa" }}>{p.notes}</div></div>}
      </>
    );
  }

  function Vendors() {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 24, color: "#d4af37", fontStyle: "italic" }}>Vendors ({vendors.length})</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.btn("ghost")} onClick={() => setModal({ type: "addPayment" })}>+ Record Payment</button>
            <button style={S.btn()} onClick={() => setModal("addVendor")}>+ Add Vendor</button>
          </div>
        </div>
        {vendors.length === 0 ? <div style={{ ...S.card, color: "#555", textAlign: "center", padding: 40 }}>Koi vendor nahi — <span style={S.link} onClick={() => setModal("addVendor")}>pehla vendor add karo →</span></div> : (
          <div style={S.card}>
            <table style={S.table}>
              <thead><tr><th style={S.th}>Naam</th><th style={S.th}>Specialty</th><th style={S.th}>Phone</th><th style={S.th}>City</th><th style={S.th}>Weddings</th><th style={S.th}>Paid</th><th style={S.th}>Pending</th><th style={S.th}></th></tr></thead>
              <tbody>
                {vendors.map(v => {
                  const vp = vendorPayments(v.id);
                  const wed = new Set(vp.map(p => p.project_id)).size;
                  const paid = vp.filter(p => p.status === "Paid").reduce((s, p) => s + Number(p.amount), 0);
                  const pend = vp.filter(p => p.status === "Pending").reduce((s, p) => s + Number(p.amount), 0);
                  return (
                    <tr key={v.id}>
                      <td style={S.td}><span style={S.link} onClick={() => { setSelectedVendor(v.id); setView("vendorDetail"); }}>{v.name}</span></td>
                      <td style={S.td}>{v.specialty || "—"}</td>
                      <td style={S.td}>{v.phone || "—"}</td>
                      <td style={S.td}>{v.city || "—"}</td>
                      <td style={S.td}>{wed}</td>
                      <td style={{ ...S.td, color: "#4ddd88" }}>₹{paid.toLocaleString()}</td>
                      <td style={{ ...S.td, color: pend ? "#f0c040" : "#555" }}>₹{pend.toLocaleString()}</td>
                      <td style={S.td}><button style={{ ...S.btn("ghost"), fontSize: 11 }} onClick={() => { setSelectedVendor(v.id); setView("vendorDetail"); }}>View →</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  function VendorDetail() {
    const v = getVendor(selectedVendor);
    if (!v) return null;
    const vp = vendorPayments(v.id);
    const projectIds = [...new Set(vp.map(p => p.project_id))];
    const vprojects = projectIds.map(pid => getProject(pid)).filter(Boolean);
    const totalPaid = vp.filter(p => p.status === "Paid").reduce((s, p) => s + Number(p.amount), 0);
    const totalPend = vp.filter(p => p.status === "Pending").reduce((s, p) => s + Number(p.amount), 0);
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ ...S.link, fontSize: 13 }} onClick={() => setView("vendors")}>← Vendors</span>
          <div style={{ fontSize: 22, color: "#d4af37", fontStyle: "italic", flex: 1 }}>{v.name}</div>
          <div style={{ fontSize: 13, color: "#888" }}>{[v.specialty, v.city, v.phone].filter(Boolean).join(" · ")}</div>
          <button style={S.btn("danger")} onClick={() => window.confirm("Delete vendor?") && deleteVendor(v.id)}>Delete</button>
        </div>
        <div style={S.statGrid(3)}>
          <div style={S.stat}><div style={S.statLabel}>Weddings Done</div><div style={S.statVal}>{vprojects.length}</div></div>
          <div style={S.stat}><div style={S.statLabel}>Total Paid</div><div style={{ ...S.statVal, color: "#4ddd88" }}>₹{totalPaid.toLocaleString()}</div></div>
          <div style={S.stat}><div style={S.statLabel}>Pending</div><div style={{ ...S.statVal, color: totalPend ? "#f0c040" : "#555" }}>₹{totalPend.toLocaleString()}</div></div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 14, color: "#d4af37", marginBottom: 14, fontStyle: "italic" }}>Weddings Mein Kaam Kiya</div>
          {vprojects.length === 0 ? <div style={{ color: "#555" }}>Abhi koi wedding assign nahi</div> :
            vprojects.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
                <span style={S.link} onClick={() => { setSelectedProject(p.id); setView("projectDetail"); }}>{p.client_name}</span>
                <span style={{ color: "#888", fontSize: 12 }}>{p.wedding_date} · {p.location || "—"}</span>
                <span style={S.badge(p.status)}>{p.status}</span>
              </div>
            ))
          }
        </div>
        <div style={S.card}>
          <div style={{ fontSize: 14, color: "#d4af37", marginBottom: 14, fontStyle: "italic" }}>Payment History</div>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Project</th><th style={S.th}>Amount</th><th style={S.th}>Date</th><th style={S.th}>Note</th><th style={S.th}>Status</th><th style={S.th}></th></tr></thead>
            <tbody>
              {vp.map(p => (
                <tr key={p.id}>
                  <td style={S.td}>{getProject(p.project_id)?.client_name || "—"}</td>
                  <td style={S.td}>₹{Number(p.amount).toLocaleString()}</td>
                  <td style={S.td}>{p.payment_date || "—"}</td>
                  <td style={{ ...S.td, color: "#888" }}>{p.note || "—"}</td>
                  <td style={S.td}><span style={S.badge(p.status)}>{p.status}</span></td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...S.btn("ghost"), fontSize: 11 }} onClick={() => togglePayment(p.id, p.status)}>{p.status === "Paid" ? "Mark Pending" : "Mark Paid"}</button>
                      <button style={{ ...S.btn("danger"), fontSize: 11 }} onClick={() => deletePayment(p.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  // ── LOADING ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#d4af37", fontFamily: "Georgia, serif", fontSize: 18, fontStyle: "italic" }}>Loading ShaadiLens CRM...</div>
    </div>
  );

  const navs = [{ id: "dashboard", label: "📊 Dashboard" }, { id: "projects", label: "💒 Projects" }, { id: "vendors", label: "🤝 Vendors" }];

  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <div style={{ padding: "0 24px 24px", borderBottom: "1px solid #2a2a2a", marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: "bold", color: "#d4af37", letterSpacing: 1 }}>ShaadiLens</div>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>Photography CRM</div>
        </div>
        {navs.map(n => <div key={n.id} style={S.navItem(navActive(n.id))} onClick={() => setView(n.id)}>{n.label}</div>)}
        <div style={{ marginTop: "auto", padding: "14px 24px", borderTop: "1px solid #2a2a2a" }}>
          <div style={{ fontSize: 10, color: "#444" }}>{projects.length} Projects · {vendors.length} Vendors</div>
          <div style={{ fontSize: 10, color: saving ? "#d4af37" : "#2a2a2a", marginTop: 4 }}>{saving ? "⟳ Saving..." : "● Synced"}</div>
          <button style={{ ...S.btn("ghost"), fontSize: 10, marginTop: 8, padding: "4px 10px" }} onClick={loadAll}>Refresh</button>
        </div>
        <button 
    style={{ marginTop: 10, padding: "6px 10px", cursor: "pointer" }}
    onClick={() => {
      localStorage.removeItem("user");
      setUser("");
    }}
  >
    Logout
  </button>
      </div>

      <div style={S.main}>
        {view === "dashboard" && <Dashboard />}
        {view === "projects" && <Projects />}
        {view === "projectDetail" && <ProjectDetail />}
        {view === "vendors" && <Vendors />}
        {view === "vendorDetail" && <VendorDetail />}
      </div>

      {modal === "addProject" && <AddProjectModal />}
      {modal === "addVendor" && <AddVendorModal />}
      {modal?.type === "addPayment" && <AddPaymentModal prefillProjectId={modal.projectId} />}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#1e1e1e", border: `1px solid ${toast.type === "error" ? "#8b2020" : "#d4af37"}`, color: toast.type === "error" ? "#ff6b6b" : "#d4af37", padding: "10px 24px", borderRadius: 8, fontSize: 13, zIndex: 2000, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
