import { Users } from "lucide-react";
import { C, hexA } from "../../lib/theme.js";
import { fmtDate, money, norm, cleanName } from "../../lib/format.js";
import { REF_STATUS_COLOR } from "../../lib/constants.js";
import { Stat, Tag } from "../../components/primitives.jsx";

function referralActionPending(r) {
  return !r.rewardGiven;
}

export function ReferralTreeView({ data, derived, today, query, onOpen }) {
  const refs = data.referrals || [];
  const clients = data.clients || [];
  const q = norm(query);

  // ── Build per-referrer stats ─────────────────────────────────
  const byReferrer = {};
  refs.forEach(r => {
    if (!r.referrerId) return;
    if (!byReferrer[r.referrerId]) byReferrer[r.referrerId] = { refs: [], totalRev: 0, attended: 0, purchased: 0, actionNeeded: 0 };
    const b = byReferrer[r.referrerId];
    b.refs.push(r);
    b.totalRev += Number(r.revenue) || 0;
    if (["Attended", "Purchased"].includes(r.status)) b.attended++;
    if (r.status === "Purchased") b.purchased++;
    if (referralActionPending(r)) b.actionNeeded++;
  });

  const sorted = Object.entries(byReferrer)
    .sort(([, a], [, b]) => b.totalRev - a.totalRev || b.refs.length - a.refs.length)
    .filter(([refId, stats]) => {
      if (!q) return true;
      const referrer = clients.find(c => c.id === refId);
      if (norm(referrer?.name).includes(q)) return true;
      return stats.refs.some(r =>
        norm(r.referredName).includes(q) || norm(r.notes).includes(q)
      );
    });

  // ── Top-level stats ──────────────────────────────────────────
  const totalRev    = refs.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const totalPurch  = refs.filter(r => r.status === "Purchased").length;
  const totalRefs   = refs.length;
  const convRate    = totalRefs > 0 ? Math.round((totalPurch / totalRefs) * 100) : 0;
  const needAction  = refs.filter(referralActionPending).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Referral revenue"  value={money(totalRev)}   accent={C.brand} hint="total from all referrals" />
        <Stat label="Conversion rate"   value={convRate + "%"}    accent={convRate >= 50 ? "#4A8C6F" : C.gold} hint={`${totalPurch} purchased of ${totalRefs}`} />
        <Stat label="Active referrers"  value={sorted.length}     hint="clients who have referred" />
        <Stat label="Action needed"     value={needAction}        accent={needAction > 0 ? "#D9892B" : C.ink3} hint="not marked completed" />
      </div>

      {/* Action needed banner — clears when Action needed tab is empty */}
      {needAction > 0 && (
        <div style={{ background: hexA("#D9892B", 0.09), border: `1px solid ${hexA("#D9892B", 0.3)}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#7A4D0F", fontWeight: 600 }}>
            {needAction} referral{needAction !== 1 ? "s" : ""} need attention — mark completed in Action needed view
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "#D9892B" }}>Check "Action needed" view →</span>
        </div>
      )}

      {/* Tree */}
      {!sorted.length ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.ink3 }}>
          <Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No referrals yet</div>
          <div style={{ fontSize: 13 }}>Add a referral when a client introduces someone to your work.</div>
        </div>
      ) : sorted.map(([refId, stats]) => {
        const referrer = clients.find(c => c.id === refId);
        const convPct  = stats.refs.length > 0 ? Math.round((stats.purchased / stats.refs.length) * 100) : 0;
        return (
          <div key={refId} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            {/* Referrer header */}
            <div style={{ padding: "14px 16px", background: hexA(C.brand, 0.04), borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {(referrer?.name || "?").replace(/^Sample - /, "").trim()[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{(referrer?.name || refId).replace(/^Sample - /, "").trim()}</div>
                <div style={{ fontSize: 12, color: C.ink3 }}>
                  {stats.refs.length} referral{stats.refs.length !== 1 ? "s" : ""} · {stats.attended} attended · {stats.purchased} purchased
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: stats.totalRev > 0 ? "#4A8C6F" : C.ink3 }}>{money(stats.totalRev)}</div>
                <div style={{ fontSize: 11, color: C.ink3 }}>referral revenue</div>
              </div>
              {stats.totalRev >= 300 && (
                <Tag color="#4A8C6F" soft>Advocate ⭐</Tag>
              )}
            </div>

            {/* Referral branches */}
            <div style={{ padding: "8px 0" }}>
              {stats.refs.map((r, i) => {
                const refClient = r.referredId ? clients.find(c => c.id === r.referredId) : null;
                const isLast = i === stats.refs.length - 1;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "flex-start", padding: "10px 16px", gap: 0, borderBottom: isLast ? "none" : `1px solid ${C.lineSoft}` }}>
                    {/* Tree connector */}
                    <div style={{ width: 36, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3, flexShrink: 0 }}>
                      <div style={{ width: 1, height: 10, background: C.line }} />
                      <div style={{ width: 16, height: 1, background: C.line }} />
                    </div>
                    {/* Branch content */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{cleanName(r.referredName)}</span>
                        {refClient && <span style={{ fontSize: 11, color: C.ink3, marginLeft: 6 }}>in system</span>}
                      </div>
                      <Tag color={REF_STATUS_COLOR[r.status]}>{r.status}</Tag>
                      {r.revenue > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#4A8C6F" }}>{money(r.revenue)}</span>}
                      <span style={{ fontSize: 11, color: C.ink3 }}>{fmtDate(r.date)}</span>
                      {!r.thankYouSent && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#D9892B", background: hexA("#D9892B", 0.1), padding: "2px 7px", borderRadius: 20 }}>Thank-you needed</span>
                      )}
                      {r.notes && <span style={{ fontSize: 11, color: C.ink3, fontStyle: "italic" }}>{r.notes}</span>}
                    </div>
                    <button onClick={() => onOpen(r)} style={{ padding: "4px 10px", fontSize: 11, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 7, cursor: "pointer", color: C.ink2, flexShrink: 0 }}>Edit</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
