import { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:3003";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || `Server returned ${response.status}`;
    throw new Error(message);
  }
  return data;
}

// ── Global styles ─────────────────────────────────────────────────────────────

function GlobalStyle() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: #F0EAD6; }

      @keyframes rowIn {
        from { opacity: 0; transform: translateY(5px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* Register table */
      .reg-table { width: 100%; border-collapse: collapse; font-family: "Segoe UI", system-ui, sans-serif; }
      .reg-table th {
        font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
        color: #7A8C74; padding: 9px 14px; text-align: left;
        border-bottom: 2px solid #1C2B1E; white-space: nowrap; background: #F8F4EC;
      }
      .reg-table th.r { text-align: right; }
      .reg-table td {
        padding: 11px 14px; font-size: 13px; color: #1C2B1E;
        border-bottom: 1px solid #DDD5BE; white-space: nowrap;
      }
      .reg-table td.r { text-align: right; font-variant-numeric: tabular-nums; }
      .reg-table tbody tr { animation: rowIn .16s ease both; }
      .reg-table tbody tr:hover { background: #EAE3CF; }
      .reg-table .rc {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 11px; color: #9A8E74; letter-spacing: .04em;
      }
      .reg-table .wt { font-weight: 600; }
      .reg-table .vl { color: #B8750A; font-weight: 700; }
      .reg-table .dim { color: #B0A898; }

      /* Responsive */
      @media (max-width: 700px) {
        .hide-sm { display: none !important; }
        .main-pad { padding: 16px !important; }
        .hdr-pad  { padding: 14px 16px !important; }
        .tab-nav  { padding: 0 4px !important; }
        .two-col  { grid-template-columns: 1fr !important; }
        .stats-row { flex-wrap: wrap; }
      }

      input:focus { outline: 2px solid #B8750A; outline-offset: 2px; }
      button:focus-visible { outline: 2px solid #B8750A; outline-offset: 2px; }

      a { color: #B8750A; }
    `}</style>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  return (
    <>
      <GlobalStyle />
      {checking ? (
        <p style={S.splash}>Loading…</p>
      ) : user ? (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      ) : (
        <Login onLogin={setUser} />
      )}
    </>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("messages");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  const logout = () =>
    fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).then(() => onLogout());

  const TABS = [
    { id: "messages", label: "Register" },
    { id: "vendors", label: "Vendors" },
    { id: "pricing", label: "Pricing" },
    { id: "upload", label: "Upload" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div style={S.page}>
      <header style={S.header} className="hdr-pad">
        <div>
          <h1 style={S.appTitle}>SMS Ingestion Register</h1>
          <p style={S.appSub}>Weigh-bridge receipts · SRIRA</p>
        </div>
        <div style={S.headerRight}>
          <span style={S.userLabel}>{user}</span>
          <button style={S.logoutBtn} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <nav style={S.tabBar} className="tab-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            style={tab === t.id ? S.tabActive : S.tab}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={S.main} className="main-pad">
        {tab === "messages" && <Messages refreshKey={refreshKey} />}
        {tab === "vendors" && <Vendors />}
        {tab === "pricing" && <Pricing />}
        {tab === "upload" && <Upload onUploadSuccess={refresh} />}
        {tab === "analytics" && <AnalyticsTab />}
      </main>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) return onLogin(username);
      setError("Invalid username or password.");
    } catch {
      setError("Could not reach server.");
    }
  };

  return (
    <div style={S.loginWrap}>
      <div style={S.loginBox}>
        <div style={S.loginGrain}>⬡</div>
        <h2 style={S.loginTitle}>SMS Ingestion</h2>
        <p style={S.loginSub}>Weigh-bridge register</p>
        {error && <p style={S.errorText}>{error}</p>}
        <input
          style={S.input}
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          style={S.input}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button style={S.primaryBtn} onClick={submit}>
          Sign in
        </button>
      </div>
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────

function useAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJson(`${API}/analytics`)
      .then((d) => {
        if (!d || typeof d !== "object" || typeof d.messageCount !== "number") {
          throw new Error("Invalid analytics response");
        }
        setData(d);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

function StatsBar({ data }) {
  if (!data) return null;
  return (
    <div style={S.statsBar} className="stats-row">
      <StatCard
        label="Receipts"
        value={(data.messageCount ?? 0).toLocaleString("en-IN")}
      />
      <StatCard
        label="Total net weight"
        value={`${(data.totalWeight ?? 0).toLocaleString("en-IN")} kg`}
      />
      <StatCard
        label="Total value"
        value={`₹ ${(data.totalValue ?? 0).toLocaleString("en-IN")}`}
        accent
      />
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...S.statCard, ...(accent ? S.statCardAccent : {}) }}>
      <span style={{ ...S.statValue, ...(accent ? { color: "#B8750A" } : {}) }}>
        {value}
      </span>
      <span style={S.statLabel}>{label}</span>
    </div>
  );
}

function AnalyticsTab() {
  const { data, loading, error } = useAnalytics();
  if (loading) return <p style={S.status}>Loading…</p>;
  if (error) return <p style={{ ...S.status, color: "#C0392B" }}>{error}</p>;
  if (!data)
    return (
      <p style={{ ...S.status, color: "#C0392B" }}>Could not load analytics.</p>
    );
  return (
    <div>
      <StatsBar data={data} />
      <div style={S.card}>
        <p style={S.formLabel}>Summary</p>
        <DataRow
          label="Total receipts"
          value={(data.messageCount ?? 0).toLocaleString("en-IN")}
        />
        <DataRow
          label="Total net weight"
          value={`${(data.totalWeight ?? 0).toLocaleString("en-IN")} kg`}
        />
        <DataRow
          label="Total value"
          value={`₹ ${(data.totalValue ?? 0).toLocaleString("en-IN")}`}
          bold
          accent
        />
      </div>
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────

function Messages({ refreshKey }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const { data: analytics } = useAnalytics();

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchJson(`${API}/processed`)
      .then((d) => {
        if (!Array.isArray(d)) {
          throw new Error("Invalid processed messages response");
        }
        setMessages(d);
      })
      .catch((err) => {
        setError(err.message);
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const q = query.toLowerCase();
  const filtered = Array.isArray(messages)
    ? messages.filter(
        (m) =>
          (m.party || "").toLowerCase().includes(q) ||
          (m.vehicle || "").toLowerCase().includes(q) ||
          (m.receipt || "").toLowerCase().includes(q),
      )
    : [];

  return (
    <div>
      <StatsBar data={analytics} />

      <input
        style={{ ...S.input, marginBottom: 18 }}
        placeholder="Filter by vehicle, party, or receipt no…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p style={S.status}>Loading receipts…</p>}
      {error && <p style={{ ...S.status, color: "#C0392B" }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p style={S.status}>
          {query
            ? "No matching receipts."
            : "No receipts yet — upload a file to begin."}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={S.tableWrap}>
          <table className="reg-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th className="hide-sm">Vehicle</th>
                <th>Party</th>
                <th className="r">Net kg</th>
                <th className="r hide-sm">₹ / kg</th>
                <th className="r">Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr
                  key={m._id}
                  style={{ animationDelay: `${Math.min(i * 10, 280)}ms` }}
                >
                  <td className="rc">{m.receipt || "—"}</td>
                  <td>{m.dates?.[0] || "—"}</td>
                  <td className="hide-sm">{m.vehicle || "—"}</td>
                  <td>{m.party || "—"}</td>
                  <td className="r wt">
                    {m.net != null ? (
                      m.net.toLocaleString("en-IN")
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                  <td className="r hide-sm">
                    {m.pricePerKg ? (
                      `₹ ${m.pricePerKg.toLocaleString("en-IN")}`
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                  <td className={`r${m.value ? " vl" : " dim"}`}>
                    {m.value ? `₹ ${m.value.toLocaleString("en-IN")}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <p style={S.tableFooter}>
          {filtered.length} receipt{filtered.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ── Vendors ───────────────────────────────────────────────────────────────────

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState(null);

  const load = () =>
    fetch(`${API}/vendors`, { credentials: "include" })
      .then((r) => r.json())
      .then(setVendors)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!name.trim()) return setError("Vendor name is required.");
    setError(null);
    await fetch(`${API}/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim(), location: location.trim() }),
    });
    setName("");
    setLocation("");
    load();
  };

  return (
    <div style={S.twoCol} className="two-col">
      <div style={S.card}>
        <p style={S.formLabel}>Add vendor</p>
        {error && <p style={S.errorText}>{error}</p>}
        <input
          style={S.input}
          placeholder="Vendor name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={S.input}
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button style={S.primaryBtn} onClick={submit}>
          Add vendor
        </button>
      </div>

      <div>
        {vendors.length === 0 ? (
          <p style={S.status}>No vendors yet.</p>
        ) : (
          <div style={S.listBox}>
            {vendors.map((v) => (
              <div key={v._id} style={S.listRow}>
                <span style={S.listName}>{v.name}</span>
                {v.location && <span style={S.listMeta}>{v.location}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  const [pricing, setPricing] = useState([]);
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState(null);

  const load = () =>
    fetch(`${API}/pricing`, { credentials: "include" })
      .then((r) => r.json())
      .then(setPricing)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!product.trim()) return setError("Product name is required.");
    if (!price || isNaN(price) || Number(price) <= 0)
      return setError("Enter a valid price.");
    setError(null);
    await fetch(`${API}/pricing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        product: product.trim(),
        pricePerKg: Number(price),
      }),
    });
    setProduct("");
    setPrice("");
    load();
  };

  return (
    <div style={S.twoCol} className="two-col">
      <div style={S.card}>
        <p style={S.formLabel}>Set product price</p>
        {error && <p style={S.errorText}>{error}</p>}
        <input
          style={S.input}
          placeholder="Product name *"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        />
        <input
          style={S.input}
          placeholder="Price per kg (₹) *"
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button style={S.primaryBtn} onClick={submit}>
          Save price
        </button>
      </div>

      <div>
        {pricing.length === 0 ? (
          <p style={S.status}>No prices set yet.</p>
        ) : (
          <div style={S.listBox}>
            {pricing.map((p) => (
              <div key={p._id} style={S.listRow}>
                <span style={S.listName}>{p.product}</span>
                <span
                  style={{ ...S.listMeta, color: "#B8750A", fontWeight: 600 }}
                >
                  ₹ {p.pricePerKg.toLocaleString("en-IN")} / kg
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload ────────────────────────────────────────────────────────────────────

function Upload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file)
      return setStatus({ type: "error", msg: "Select a JSON file first." });
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok)
        return setStatus({
          type: "error",
          msg: data.error || "Upload failed.",
        });
      const dupNote =
        data.duplicates > 0
          ? ` (${data.duplicates} already existed, skipped)`
          : "";
      setStatus({
        type: "success",
        msg: `${data.processed} new receipt${data.processed !== 1 ? "s" : ""} added.${dupNote}`,
      });
      if (onUploadSuccess) onUploadSuccess();
      setFile(null);
      document.getElementById("json-file-input").value = "";
    } catch {
      setStatus({ type: "error", msg: "Could not reach server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 460 }}>
      <div style={S.card}>
        <p style={S.formLabel}>Upload receipts</p>
        <p style={S.helpText}>
          JSON array of objects with a <code style={S.code}>text</code> field.
        </p>

        <label style={S.fileLabel} htmlFor="json-file-input">
          <input
            id="json-file-input"
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              setFile(e.target.files[0]);
              setStatus(null);
            }}
          />
          {file ? (
            <>
              <strong>{file.name}</strong> · {(file.size / 1024).toFixed(1)} KB
            </>
          ) : (
            "Choose a .json file…"
          )}
        </label>

        <button
          style={loading ? { ...S.primaryBtn, opacity: 0.55 } : S.primaryBtn}
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Ingesting…" : "Upload"}
        </button>

        {status && (
          <p
            style={{
              ...S.helpText,
              color: status.type === "success" ? "#2D6A2D" : "#C0392B",
              fontWeight: 500,
              marginTop: 4,
            }}
          >
            {status.msg}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function DataRow({ label, value, bold, accent }) {
  return (
    <div style={S.dataRow}>
      <span style={S.dataLabel}>{label}</span>
      <span
        style={{
          ...S.dataValue,
          ...(bold ? { fontWeight: 700 } : {}),
          ...(accent ? { color: "#B8750A" } : {}),
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const S = {
  page: {
    background: "#F0EAD6",
    minHeight: "100vh",
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    color: "#1C2B1E",
  },
  splash: {
    padding: 48,
    color: "#7A8C74",
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  },

  // Header
  header: {
    background: "#1E3A1E",
    padding: "20px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "3px solid #B8750A",
  },
  appTitle: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 19,
    fontWeight: 400,
    color: "#FFFFFF",
    letterSpacing: ".02em",
  },
  appSub: {
    fontSize: 10,
    color: "#7AAB7A",
    marginTop: 4,
    letterSpacing: ".08em",
    textTransform: "uppercase",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 14 },
  userLabel: { fontSize: 11, color: "#7AAB7A", letterSpacing: ".05em" },
  logoutBtn: {
    fontSize: 11,
    padding: "5px 12px",
    cursor: "pointer",
    border: "1px solid #3A5C3A",
    background: "transparent",
    color: "#7AAB7A",
    borderRadius: 3,
    letterSpacing: ".04em",
  },

  // Tab bar
  tabBar: {
    background: "#1A341A",
    padding: "0 28px",
    display: "flex",
    gap: 0,
    borderBottom: "1px solid #253E25",
  },
  tab: {
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    color: "#608060",
    cursor: "pointer",
    fontSize: 13,
    borderBottom: "2px solid transparent",
    marginBottom: -1,
  },
  tabActive: {
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    borderBottom: "2px solid #B8750A",
    marginBottom: -1,
  },

  // Main
  main: { padding: "28px 32px", maxWidth: 1080, margin: "0 auto" },

  // Stats bar
  statsBar: { display: "flex", gap: 12, marginBottom: 22 },
  statCard: {
    flex: 1,
    background: "#FFFFFF",
    borderRadius: 6,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    border: "1px solid #DDD5BE",
  },
  statCardAccent: { background: "#FDF5E4", borderColor: "#E2C07A" },
  statValue: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 22,
    fontWeight: 400,
    color: "#1C2B1E",
    letterSpacing: "-.01em",
  },
  statLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: ".08em",
    color: "#7A8C74",
  },

  // Register table
  tableWrap: {
    background: "#FFFFFF",
    border: "1px solid #DDD5BE",
    borderRadius: 6,
    overflow: "hidden",
    overflowX: "auto",
  },
  tableFooter: {
    fontSize: 11,
    color: "#B0A898",
    marginTop: 8,
    textAlign: "right",
    letterSpacing: ".04em",
  },

  // Card
  card: {
    background: "#FFFFFF",
    border: "1px solid #DDD5BE",
    borderRadius: 6,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 16,
  },

  // Two-col layout
  twoCol: {
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: 20,
    alignItems: "start",
  },

  // List
  listBox: {
    background: "#FFFFFF",
    border: "1px solid #DDD5BE",
    borderRadius: 6,
    overflow: "hidden",
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "11px 16px",
    borderBottom: "1px solid #EEE8D8",
  },
  listName: { fontSize: 14, color: "#1C2B1E", fontWeight: 500 },
  listMeta: { fontSize: 12, color: "#7A8C74" },

  // Forms
  formLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: ".08em",
    color: "#7A8C74",
    fontWeight: 600,
  },
  input: {
    padding: "9px 12px",
    border: "1px solid #DDD5BE",
    borderRadius: 4,
    fontSize: 14,
    width: "100%",
    background: "#FAFAF5",
    color: "#1C2B1E",
  },
  primaryBtn: {
    padding: "10px 22px",
    background: "#1E3A1E",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    cursor: "pointer",
    letterSpacing: ".02em",
    marginTop: 4,
  },
  fileLabel: {
    display: "block",
    padding: "12px 16px",
    border: "1px dashed #C8BFA8",
    borderRadius: 4,
    fontSize: 13,
    color: "#7A8C74",
    cursor: "pointer",
    textAlign: "center",
    background: "#FAFAF5",
  },
  helpText: { fontSize: 12, color: "#7A8C74" },
  code: {
    fontFamily: "'Courier New', monospace",
    background: "#EEE8D8",
    padding: "1px 5px",
    borderRadius: 3,
    fontSize: 12,
  },
  errorText: { fontSize: 13, color: "#C0392B" },
  status: { fontSize: 13, color: "#7A8C74", padding: "16px 0" },

  // Data rows
  dataRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #EEE8D8",
  },
  dataLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: ".07em",
    color: "#7A8C74",
  },
  dataValue: { fontSize: 15, color: "#1C2B1E" },

  // Login
  loginWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#1E3A1E",
  },
  loginBox: {
    background: "#FFFFFF",
    borderRadius: 8,
    padding: "40px 36px",
    width: 320,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
  },
  loginGrain: {
    fontSize: 22,
    color: "#B8750A",
    lineHeight: 1,
    marginBottom: 4,
  },
  loginTitle: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 22,
    fontWeight: 400,
    color: "#1C2B1E",
  },
  loginSub: {
    fontSize: 10,
    color: "#7A8C74",
    textTransform: "uppercase",
    letterSpacing: ".1em",
    marginBottom: 10,
  },
};
