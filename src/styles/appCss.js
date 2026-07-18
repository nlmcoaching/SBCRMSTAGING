import { C, hexA } from "../lib/theme.js";

export function buildAppCss() {
  return `
* { box-sizing: border-box; }
input, textarea, select, button { font-family: inherit; }
.lucide { stroke-width: 1.5 !important; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.sb-shell { display: flex; min-height: 100vh; }
.sb-sidebar { width: 226px; flex-shrink: 0; background: ${C.surface}; border-right: 1px solid ${C.line}; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; z-index: 40; }
.sb-navbtn { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 12px; border: none; border-radius: 9px; font-size: 14px; cursor: pointer; transition: background .12s; }
.sb-navbtn:hover { background: ${C.brandMist}; }
.sb-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sb-header { display: flex; align-items: center; gap: 12px; padding: 16px 28px; border-bottom: 1px solid ${C.line}; background: ${hexA(C.bg, 0.85)}; backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 20; }
.sb-content { padding: 22px 28px 28px; max-width: 1280px; width: 100%; }
.sb-menu { display: none; background: none; border: none; cursor: pointer; color: ${C.ink}; padding: 4px; }
.sb-scrim { display: none; }
.sb-search { display: flex; align-items: center; gap: 7px; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 9px; padding: 7px 11px; width: 220px; }
.sb-search input { border: none; outline: none; background: none; font-size: 13.5px; width: 100%; color: ${C.ink}; }
.sb-card { background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 14px; }
.sb-primary { display: inline-flex; align-items: center; gap: 6px; background: ${C.brand}; color: #fff; border: none; border-radius: 9px; padding: 8px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background .12s; }
.sb-primary:hover { background: ${C.brandDeep}; }
.sb-ghost { display: inline-flex; align-items: center; gap: 6px; background: ${C.surface}; color: ${C.ink2}; border: 1px solid ${C.line}; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-ghost:hover { background: ${C.surfaceAlt}; }
.sb-danger { display: inline-flex; align-items: center; gap: 6px; background: none; color: #B4513B; border: 1px solid ${hexA("#B4513B", 0.3)}; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-danger:hover { background: ${hexA("#B4513B", 0.07)}; }
.sb-link { display: inline-flex; align-items: center; gap: 2px; background: none; border: none; color: ${C.brand}; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-iconbtn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 8px; cursor: pointer; color: ${C.ink2}; }
.sb-iconbtn:hover { background: ${C.surfaceAlt}; }

.sb-hero { display: flex; align-items: center; gap: 20px; background: linear-gradient(120deg, ${C.brandMist}, ${C.surface}); border: 1px solid ${C.line}; border-radius: 16px; padding: 22px 26px; }
.sb-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sb-stat { padding: 16px 18px; }
.sb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.sb-panelhead { display: flex; align-items: center; gap: 9px; padding: 15px 18px 10px; }
.sb-panelbody { padding: 0 8px 8px; }
.sb-badge { background: ${C.brandSoft}; color: ${C.brandDeep}; font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 20px; }
.sb-listrow { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; text-align: left; }
.sb-listrow:hover { background: ${C.surfaceAlt}; }
.sb-nba-row:hover { background: ${C.surfaceAlt}; }
.sb-actionrow { align-items: flex-start; padding: 12px 14px; border-bottom: 1px solid ${C.lineSoft}; border-radius: 0; }
.sb-actionrow:last-child { border-bottom: none; }
.sb-actionrow:hover { background: ${C.brandMist}; }
.sb-rowtitle { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-rowsub { font-size: 12px; color: ${C.ink3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-rowval { font-size: 13px; font-weight: 600; color: ${C.brand}; white-space: nowrap; }
.sb-mininote { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: ${C.ink3}; padding: 8px 12px 2px; }

.sb-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.sb-tab { background: none; border: none; padding: 7px 13px; border-radius: 8px; font-size: 13.5px; font-weight: 600; color: ${C.ink3}; cursor: pointer; }
.sb-tab:hover { color: ${C.ink2}; background: ${C.surfaceAlt}; }
.sb-tab-on { color: ${C.brandDeep}; background: ${C.brandSoft}; }

.sb-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.sb-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; font-weight: 600; padding: 12px 16px; border-bottom: 1px solid ${C.line}; white-space: nowrap; }
.sb-table td { padding: 13px 16px; border-bottom: 1px solid ${C.lineSoft}; color: ${C.ink}; white-space: nowrap; }
.sb-trow { cursor: pointer; }
.sb-trow:hover td { background: ${C.surfaceAlt}; }
.sb-table tbody tr:last-child td { border-bottom: none; }
.sb-table tfoot td { padding: 12px 16px; border-top: 2px solid ${C.line}; background: ${C.surfaceAlt}; font-size: 13.5px; }

.sb-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; }
.sb-col { min-width: 224px; width: 224px; flex-shrink: 0; }
.sb-colhead { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 10px; }
.sb-bcard { display: block; width: 100%; text-align: left; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 11px; padding: 11px 12px; cursor: pointer; transition: box-shadow .12s, transform .12s; }
.sb-bcard:hover { box-shadow: 0 4px 16px ${hexA(C.brandDeep, 0.1)}; transform: translateY(-1px); }
.sb-emptycard { border: 1px dashed ${C.line}; border-radius: 11px; padding: 14px; text-align: center; color: ${C.ink3}; font-size: 13px; }

.sb-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.sb-caldow { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; text-align: center; padding-bottom: 4px; font-weight: 600; }
.sb-calcell { border-radius: 9px; padding: 6px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
.sb-calev { font-size: 10.5px; font-weight: 600; background: ${C.brandSoft}; color: ${C.brandDeep}; border: none; border-radius: 5px; padding: 3px 5px; cursor: pointer; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-calev:hover { background: ${C.brand}; color: #fff; }

.sb-drawerwrap { position: fixed; inset: 0; background: ${hexA(C.brandDeep, 0.38)}; display: flex; align-items: center; justify-content: center; z-index: 60; backdrop-filter: blur(4px); padding: 20px; }
.sb-drawer { width: 700px; max-width: 96vw; max-height: 90vh; background: ${C.surface}; border-radius: 20px; display: flex; flex-direction: column; box-shadow: 0 24px 80px ${hexA(C.brandDeep, 0.32)}, 0 4px 20px ${hexA(C.brandDeep, 0.12)}; animation: sb-pop .22s cubic-bezier(.22,.68,0,1.2); overflow: hidden; }
.sb-drawer-wide { width: 900px; }
.sb-modal { width: 540px; max-width: 94vw; max-height: 88vh; margin: auto; background: ${C.surface}; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 60px ${hexA(C.brandDeep, 0.3)}; animation: sb-pop .2s ease; }
.sb-drawerwrap:has(.sb-modal) { align-items: center; justify-content: center; }
@keyframes sb-slide { from { transform: translateX(30px); opacity: .6; } to { transform: none; opacity: 1; } }
@keyframes sb-pop { from { transform: scale(.96) translateY(6px); opacity: 0; } to { transform: none; opacity: 1; } }
.sb-drawerhead { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 16px; border-bottom: 1px solid ${C.line}; flex-shrink: 0; }
.sb-eyebrow { font-size: 11.5px; text-transform: uppercase; letter-spacing: .12em; color: ${C.ink3}; font-weight: 600; }
.sb-drawerbody { padding: 20px 22px; overflow-y: auto; flex: 1; }
.sb-drawerfoot { display: flex; align-items: center; gap: 9px; padding: 14px 22px; border-top: 1px solid ${C.line}; flex-shrink: 0; }
.sb-titleinput { font-family: ${FONT.display}; font-size: 22px; font-weight: 600; border: none; outline: none; width: 100%; color: ${C.ink}; padding: 0 0 14px; }
.sb-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.sb-field { display: flex; flex-direction: column; gap: 5px; }
.sb-field-wide { grid-column: 1 / -1; }
.sb-flabel { font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: ${C.ink3}; font-weight: 600; }
.sb-input { border: 1px solid ${C.line}; border-radius: 8px; padding: 8px 11px; font-size: 13.5px; outline: none; color: ${C.ink}; background: ${C.surface}; width: 100%; }
.sb-input:focus { border-color: ${C.brand}; box-shadow: 0 0 0 3px ${hexA(C.brand, 0.12)}; }
.sb-affix { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12px; color: ${C.ink3}; }
.sb-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
.sb-selchip { border: 1px solid ${C.line}; border-radius: 20px; padding: 5px 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all .1s; }
.sb-rellabel { display: flex; align-items: center; gap: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; font-weight: 700; padding-bottom: 7px; border-bottom: 1px solid ${C.lineSoft}; margin-bottom: 6px; }
.sb-relrow { display: flex; align-items: center; gap: 9px; width: 100%; background: none; border: none; padding: 8px 6px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.sb-relrow:hover { background: ${C.surfaceAlt}; }
.sb-importrow { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border: 1px solid ${C.line}; border-radius: 11px; }
.sb-importok { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: ${C.brand}; }

.sb-breathe { animation: sb-breath 8s ease-in-out infinite; }
.sb-breathe2 { animation-delay: .4s; }
@keyframes sb-breath { 0%,100% { transform: scale(.82); opacity: .25; } 45% { transform: scale(1.12); opacity: .55; } }
@media (prefers-reduced-motion: reduce) { .sb-breathe { animation: none; } }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 6px; border: 2px solid ${C.bg}; }
:focus-visible { outline: 2px solid ${C.brand}; outline-offset: 2px; }

@media (max-width: 860px) {
  .sb-sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); transition: transform .22s; box-shadow: 4px 0 30px ${hexA(C.brandDeep, 0.2)}; }
  .sb-sidebar.sb-open { transform: none; }
  .sb-scrim { display: block; position: fixed; inset: 0; background: ${hexA(C.brandDeep, 0.3)}; z-index: 35; }
  .sb-menu { display: inline-flex; }
  .sb-stats { grid-template-columns: 1fr 1fr; }
  .sb-nba-grid { grid-template-columns: 1fr !important; }
  .sb-pipeline-grid { grid-template-columns: 1fr 1fr !important; }
  .sb-lane-split { flex-direction: column !important; }
  .sb-grid2 { grid-template-columns: 1fr; }
  .sb-content, .sb-header { padding-left: 16px; padding-right: 16px; }
  .sb-search { width: 130px; }
  .sb-fields { grid-template-columns: 1fr; }
  .sb-hero { flex-direction: column; text-align: center; }
}
`;
}
