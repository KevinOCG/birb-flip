"use client";
// Birb Flip — Gamified BIRB Staking (POC)

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ── Music System ─────────────────────────────────────────────────────────── */
function useLofiMusic() {
  const aRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(0.06);
  useEffect(() => {
    const a = new Audio("/lofi-track.mp3");
    a.loop = true; a.volume = vol; aRef.current = a;
    a.play().catch(() => setMuted(true));
    return () => { a.pause(); a.src = ""; };
  }, []);
  useEffect(() => { if (aRef.current) aRef.current.volume = vol; }, [vol]);
  const toggle = useCallback(() => {
    const a = aRef.current; if (!a) return;
    if (muted) { a.play().catch(() => {}); setMuted(false); }
    else { a.pause(); setMuted(true); }
  }, [muted]);
  return { muted, toggle, vol, setVol };
}

/* ── Sound Effects ────────────────────────────────────────────────────────── */
function useSFX() {
  const ctxRef = useRef<AudioContext | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCtx = () => { if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); return ctxRef.current; };

  const coinSpin = useCallback(() => {
    const c = getCtx();
    const gaps = [110,88,72,58,46,38,32,27,24,22,20,20,21,24,28,35,44,60,88,135,210,330];
    let elapsed = 0;
    gaps.forEach(ms => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.type = "triangle";
      o.frequency.value = 580 + Math.random() * 640;
      const t = c.currentTime + elapsed / 1000;
      g.gain.setValueAtTime(0.11, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.038);
      o.start(t); o.stop(t + 0.04); elapsed += ms;
    });
  }, []);

  const playWin = useCallback((streak: number) => {
    const c = getCtx();
    const notes = streak >= 4 ? [523,659,784,1047,1319,1568,2093] : streak >= 2 ? [523,659,784,1047,1319] : [523,659,784];
    const d = streak >= 4 ? 0.17 : 0.14;
    notes.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.type = "sine"; o.frequency.value = f;
      const t = c.currentTime + i * d;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(streak >= 4 ? 0.4 : 0.28, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + d * 2.1); o.start(t); o.stop(t + d * 2.3);
    });
    if (streak >= 5) {
      for (let i = 0; i < 10; i++) {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination); o.type = "sine"; o.frequency.value = 2200 + Math.random() * 2800;
        const t = c.currentTime + 0.5 + i * 0.07;
        g.gain.setValueAtTime(0.045, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14); o.start(t); o.stop(t + 0.16);
      }
    }
  }, []);

  const playLose = useCallback(() => {
    const c = getCtx();
    [392,330,262,196].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.type = "sine"; o.frequency.value = f;
      const t = c.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.24, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.26); o.start(t); o.stop(t + 0.28);
    });
  }, []);

  const playLockIn = useCallback((streak: number) => {
    const c = getCtx(); const base = 440 + streak * 105;
    [base, base * 1.26, base * 1.5, base * 2].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.type = i < 2 ? "sine" : "triangle"; o.frequency.value = f;
      const t = c.currentTime + i * 0.055;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.36); o.start(t); o.stop(t + 0.38);
    });
  }, []);

  return { coinSpin, playWin, playLose, playLockIn };
}

/* ── Constants & Math ────────────────────────────────────────────────────── */
const STREAK_RATES = [1.8, 2.4, 3.4, 5.0, 7.5, 11.0];
const STREAK_LABELS = ["Base", "×1 Streak", "×2 Streak", "×3 Streak", "×4 Hot", "×5 Legendary"];

function goldMult(day: number): number {
  if (day <= 5) return 1.0; // 5-day flat grace period
  return +(0.35 + 0.65 * Math.exp(-0.09 * (day - 5))).toFixed(3);
}

function effectiveRate(streak: number, day: number): number {
  const base = STREAK_RATES[Math.min(streak, STREAK_RATES.length - 1)];
  return +(base * goldMult(day)).toFixed(2);
}

function easeOut4(t: number) { return 1 - Math.pow(1 - t, 4); }
function coinEase(t: number) {
  // Fast first 55% of duration, then dramatic deceleration
  if (t < 0.55) return (t / 0.55) * 0.88;
  return 0.88 + 0.12 * easeOut4((t - 0.55) / 0.45);
}

/* ── Types ───────────────────────────────────────────────────────────────── */
type Phase = "idle" | "depositing" | "playing" | "flipping" | "win-decision" | "lose-result" | "session-end";
type Side = "heads" | "tails";
type Entry = { n: number; result: Side; outcome: "win" | "lose" | "lockin"; stake: number; gold: number; streak: number };
type Team = { name: string; code: string; totalVolume: number; rank?: number; members: string[] };

/* ── Coin Component ──────────────────────────────────────────────────────── */
function BirbCoin({ spinning, result, onDone, streak }: {
  spinning: boolean; result: Side | null; onDone: () => void; streak: number;
}) {
  const rotRef = useRef(0);
  const [rot, setRot] = useState(0);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  useEffect(() => {
    if (!spinning || !result) return;
    const start = rotRef.current;
    const norm = ((start % 360) + 360) % 360;
    const land = result === "heads" ? 0 : 180;
    const spins = 7 + Math.floor(Math.random() * 3);
    const target = start - norm + spins * 360 + land;
    const delta = target - start;
    const dur = 3400;
    const t0 = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    function frame(now: number) {
      const p = Math.min((now - t0) / dur, 1);
      const cur = start + delta * coinEase(p);
      rotRef.current = cur; setRot(cur);
      if (p < 1) { rafRef.current = requestAnimationFrame(frame); }
      else { rotRef.current = target; setRot(target); onDoneRef.current(); }
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [spinning, result]);

  const isLegendary = streak >= 4;

  return (
    <div className="relative flex items-center justify-center py-6">
      <motion.div
        className={cn("absolute rounded-full blur-3xl pointer-events-none",
          isLegendary ? "h-80 w-80 bg-[#ffd700]/28" : streak >= 2 ? "h-64 w-64 bg-[#d12429]/20" : "h-56 w-56 bg-[#7c5237]/15"
        )}
        animate={spinning ? { scale: [1, 1.15, 1], opacity: [0.4, 0.68, 0.4] } : { scale: 1, opacity: 0.42 }}
        transition={{ duration: 0.45, repeat: spinning ? Infinity : 0 }}
      />
      <div style={{ perspective: "700px" }}>
        <div className="relative h-56 w-56" style={{ transformStyle: "preserve-3d", transform: `rotateY(${rot}deg)` }}>
          {/* Heads — golden BIRB token */}
          <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              background: "radial-gradient(circle at 36% 30%, #f8df70, #c4921a 52%, #7a5810 100%)",
              boxShadow: isLegendary
                ? "0 0 0 6px #ffd700, 0 0 0 8px rgba(255,215,0,0.22), 0 0 40px rgba(255,215,0,0.28), inset 0 3px 0 rgba(255,250,180,0.5)"
                : "0 0 0 5px #c9a86c, 0 0 18px rgba(201,168,108,0.18), inset 0 2px 0 rgba(255,245,200,0.38)",
            }}>
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 26% 20%, rgba(255,255,220,0.52) 0%, transparent 44%)" }} />
            <img src="/images/birb-token.png" alt="BIRB" className="h-36 w-36 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)] mix-blend-multiply relative z-10" />
            <div className="absolute bottom-4 z-10 text-[9px] font-black uppercase tracking-[0.28em] text-[#7a5810]/72">HEADS</div>
          </div>
          {/* Tails — dark moon face */}
          <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center overflow-hidden"
            style={{
              backfaceVisibility: "hidden", transform: "rotateY(180deg)",
              background: "radial-gradient(circle at 36% 30%, #3b2f60, #1e1a34 55%, #0d0a1c 100%)",
              boxShadow: "0 0 0 5px #3d3060, 0 0 18px rgba(100,80,180,0.12), inset 0 2px 0 rgba(180,160,255,0.18)",
            }}>
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 26% 20%, rgba(180,150,255,0.18) 0%, transparent 46%)" }} />
            <svg viewBox="0 0 100 100" className="h-32 w-32 relative z-10 opacity-80">
              <path d="M58 14 Q32 20 28 50 Q24 80 54 86 Q28 77 33 50 Q38 23 58 14Z" fill="rgba(200,180,255,0.75)" />
              {([[74,24,2.5],[81,44,1.5],[66,62,2],[84,65,1.2],[77,79,1.5]] as [number,number,number][]).map(([cx,cy,r],i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.8)" />
              ))}
            </svg>
            <div className="absolute bottom-4 z-10 text-[9px] font-black uppercase tracking-[0.28em] text-[#a090c8]/68">TAILS</div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isLegendary && !spinning && result === "heads" && (
          <>
            {[...Array(10)].map((_, i) => (
              <motion.div key={i} className="absolute h-2.5 w-2.5 rounded-full bg-[#ffd700] pointer-events-none z-20"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(i / 10 * Math.PI * 2) * 148, y: Math.sin(i / 10 * Math.PI * 2) * 148, opacity: 0, scale: 0 }}
                transition={{ duration: 1.4, delay: i * 0.05, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Streak Bar ──────────────────────────────────────────────────────────── */
function StreakBar({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/38">Streak</span>
      <div className="flex gap-1.5">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} animate={i < streak ? { scale: [1,1.35,1] } : {}} transition={{ delay: i*0.06, duration: 0.3 }}
            className={cn("h-3 w-3 rounded-full transition-all duration-300",
              i < streak
                ? streak >= 5 ? "bg-[#ffd700] shadow-[0_0_10px_rgba(255,215,0,0.8)]"
                  : streak >= 3 ? "bg-[#f97316] shadow-[0_0_7px_rgba(249,115,22,0.7)]"
                  : "bg-[#d12429] shadow-[0_0_6px_rgba(209,36,41,0.6)]"
                : "bg-white/10"
            )}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {streak > 0 && (
          <motion.span key={streak} initial={{ scale:0.6, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.6, opacity:0 }}
            className={cn("text-xs font-black", streak >= 5 ? "text-[#ffd700]" : streak >= 3 ? "text-[#f97316]" : "text-[#d12429]")}
          >
            {streak >= 5 ? "🔥 LEGENDARY" : streak >= 3 ? "🔥 ON FIRE" : `×${streak} streak`}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Gold Decay Curve ────────────────────────────────────────────────────── */
function GoldDecayCurve({ day }: { day: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pts = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => `${(i/27)*100},${(1-goldMult(i+1))*100}`).join(" "), []);
  const px = ((day-1)/27)*100, py = (1-goldMult(day))*100;
  const graceW = ((4)/27*100).toFixed(1);
  useEffect(() => {
    if (!svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    setPos({ x: (px/100)*r.width, y: ((py+5)/110)*r.height });
  }, [day, px, py]);
  return (
    <div className="relative h-12 w-full">
      <svg ref={svgRef} viewBox="-2 -5 104 110" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" /><stop offset={`${graceW}%`} stopColor="#22c55e" />
            <stop offset={`${(parseFloat(graceW)+1).toFixed(1)}%`} stopColor="#d12429" /><stop offset="100%" stopColor="#ecd9ba" />
          </linearGradient>
          <linearGradient id="cf2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(209,36,41,0.13)" /><stop offset="100%" stopColor="rgba(209,36,41,0)" />
          </linearGradient>
        </defs>
        <rect x="0" y="-5" width={graceW} height="110" fill="rgba(34,197,94,0.06)" />
        <line x1={graceW} y1="-5" x2={graceW} y2="105" stroke="rgba(34,197,94,0.25)" strokeWidth="0.8" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" />
        <polyline points={pts} fill="none" stroke="url(#cg2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <polyline points={`0,0 ${pts} 100,${(1-goldMult(28))*100} 100,100 0,100`} fill="url(#cf2)" />
      </svg>
      <div className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d12429] shadow-[0_0_8px_rgba(209,36,41,0.65)] pointer-events-none" style={{ left:pos.x, top:pos.y }}>
        <div className="absolute inset-[-4px] rounded-full border border-[#d12429]/38" />
      </div>
    </div>
  );
}

/* ── Gold Rain ───────────────────────────────────────────────────────────── */
function GoldRain({ active }: { active: boolean }) {
  const tokens = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i, left: Math.random()*100, delay: Math.random()*2.8,
    dur: 2.6+Math.random()*2.2, size: 18+Math.random()*24,
    rot: Math.random()*360, rotSpd: (Math.random()-0.5)*720,
  })), []);
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {tokens.map(t => (
        <motion.div key={t.id}
          initial={{ y:-100, x:`${t.left}vw`, rotate:t.rot, opacity:0 }}
          animate={{ y:"110vh", rotate:t.rot+t.rotSpd, opacity:[0,0.9,0.9,0] }}
          transition={{ duration:t.dur, delay:t.delay, ease:"linear", repeat:Infinity, repeatDelay:Math.random()*2.5 }}
          style={{ position:"absolute", left:0, width:t.size, height:t.size }}
        >
          <img src="/images/birb-token.png" alt="" className="h-full w-full object-contain drop-shadow-[0_0_6px_rgba(255,200,80,0.5)]" />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Share Modal ─────────────────────────────────────────────────────────── */
function ShareModal({ open, onClose, gold, deposit, highStreak }: {
  open: boolean; onClose: () => void; gold: number; deposit: number; highStreak: number;
}) {
  if (!open) return null;
  const isLegendary = highStreak >= 4;
  const tweet = () => {
    const txt = highStreak >= 4
      ? `🔥 LEGENDARY! ${highStreak}-flip streak on Birb Flip — earned ${gold.toLocaleString()} Gold from ${deposit.toLocaleString()} BIRB. Absolutely birbish! 🐦`
      : `${highStreak > 1 ? `${highStreak}-flip streak! ` : ""}I just earned ${gold.toLocaleString()} Gold on Birb Flip with ${deposit.toLocaleString()} BIRB staked! 🐦 #BirbFlip`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}`, "_blank", "width=550,height=420");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/82 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.88 }} className="relative z-10 w-full max-w-sm">
        <button onClick={onClose} className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1210] text-white/60 hover:text-white transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="overflow-hidden rounded-3xl border border-[#ffd700]/20 bg-black">
          <div className="relative px-7 pt-7 pb-5">
            <img src="/images/birb-gold.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-22 pointer-events-none" />
            <div className="relative z-10">
              <div className={cn("inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-black",
                isLegendary ? "bg-gradient-to-r from-[#ffd700] to-[#f97316]" : "bg-gradient-to-r from-[#d12429] to-[#f97316]"
              )}>
                {highStreak >= 5 ? "LEGENDARY STREAK" : highStreak >= 3 ? `${highStreak}× HOT STREAK` : `${highStreak}× STREAK`}
              </div>
              <h2 className="mt-3 font-heading text-4xl font-black text-white">Birbish AF</h2>
              <p className="mt-1 text-sm text-white/55">I stacked Gold on Birb Flip</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 border-t border-[#ffd700]/10 bg-black px-7 py-5">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/38">BIRB Played</div>
              <div className="mt-1 font-heading text-2xl font-bold text-white">{deposit.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/38">Gold Earned</div>
              <div className="mt-1 font-heading text-2xl font-bold bg-gradient-to-r from-[#ffd700] via-[#ffec8b] to-[#ffd700] bg-clip-text text-transparent">+{gold.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={tweet} className="flex items-center justify-center gap-2 rounded-xl bg-[#1d9bf0] py-3 text-sm font-semibold text-white hover:bg-[#1a8cd8] transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </button>
          <button onClick={onClose} className="rounded-xl border border-[#ecd9ba]/20 py-3 text-sm font-medium text-white/60 hover:text-white hover:bg-[#ecd9ba]/5 transition">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function Page() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [depositInput, setDepositInput] = useState("1000");
  const [balance, setBalance] = useState(0);
  const [stakeInput, setStakeInput] = useState("");
  const [stakePercent, setStakePercent] = useState(10);
  const [streak, setStreak] = useState(0);
  const [pendingStakes, setPendingStakes] = useState<number[]>([]);
  const [bankedGold, setBankedGold] = useState(0);
  const [coinResult, setCoinResult] = useState<Side | null>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [showShare, setShowShare] = useState(false);
  const [sessionDeposit, setSessionDeposit] = useState(0);
  const [sessionGold, setSessionGold] = useState(0);
  const [sessionHighStreak, setSessionHighStreak] = useState(0);
  const [team, setTeam] = useState<Team | null>(null);
  const [totalBirb, setTotalBirb] = useState(15478);
  const [lifetimeGold, setLifetimeGold] = useState(28814);
  const [totalFlips, setTotalFlips] = useState(42);
  const [totalWins, setTotalWins] = useState(26);
  const [dailyStreak] = useState(3);

  const flingedStakeRef = useRef(0);
  const { muted, toggle: toggleMute, vol, setVol } = useLofiMusic();
  const { coinSpin, playWin, playLose, playLockIn } = useSFX();

  useEffect(() => { const s = localStorage.getItem("birb-team"); if (s) try { setTeam(JSON.parse(s)); } catch { } }, []);

  const depositNum = Math.max(0, Number(depositInput) || 0);
  const dayMult = goldMult(currentDay);
  const computedStake = stakeInput ? Math.max(1, Math.min(balance, Number(stakeInput)||0)) : Math.max(1, Math.floor(balance*stakePercent/100));
  const stake = Math.min(computedStake, balance);
  const currRate = effectiveRate(streak, currentDay);
  const nextRate = effectiveRate(streak+1, currentDay);
  const pendingTotal = pendingStakes.reduce((a,b)=>a+b,0);
  const pendingGold = Math.floor(pendingTotal * currRate);
  const nextPendingGold = Math.floor((pendingTotal + stake) * nextRate);
  const isLegendary = streak >= 4;

  function handleDeposit() {
    if (depositNum <= 0) return; setPhase("depositing");
    setTimeout(() => {
      setBalance(depositNum); setSessionDeposit(depositNum); setSessionGold(0); setSessionHighStreak(0);
      setBankedGold(0); setStreak(0); setPendingStakes([]); setLog([]); setPhase("playing");
    }, 1800);
  }

  function handleFlip() {
    if (phase !== "playing" || stake <= 0 || balance < stake) return;
    flingedStakeRef.current = stake;
    setBalance(b => b - stake); setTotalBirb(b => b + stake);
    if (team) { const t={...team,totalVolume:team.totalVolume+stake}; setTeam(t); localStorage.setItem("birb-team",JSON.stringify(t)); }
    const result: Side = Math.random() < 0.5 ? "heads" : "tails";
    setCoinResult(result); setPhase("flipping"); coinSpin();
  }

  function handleCoinDone() {
    if (!coinResult) return;
    const usedStake = flingedStakeRef.current;
    if (coinResult === "heads") {
      playWin(streak+1); setTotalWins(w=>w+1); setTotalFlips(f=>f+1);
      setPendingStakes(p=>[...p,usedStake]);
      setStreak(s => { const ns=s+1; setSessionHighStreak(h=>Math.max(h,ns)); return ns; });
      setPhase("win-decision");
    } else {
      playLose(); setTotalFlips(f=>f+1);
      setLog(l=>[...l,{n:l.length+1,result:"tails",outcome:"lose",stake:usedStake,gold:0,streak}]);
      setStreak(0); setPendingStakes([]); setPhase("lose-result");
      setTimeout(() => { setBalance(b => { if(b<1){setPhase("session-end");return b;} setPhase("playing");return b; }); }, 2000);
    }
  }

  function handleLockIn() {
    const earned = pendingGold; playLockIn(streak);
    setBankedGold(g=>g+earned); setSessionGold(g=>g+earned); setLifetimeGold(g=>g+earned);
    setLog(l=>[...l,{n:l.length+1,result:"heads",outcome:"lockin",stake:pendingTotal,gold:earned,streak}]);
    setStreak(0); setPendingStakes([]);
    setBalance(b => { if(b<1){setPhase("session-end");return b;} setPhase("playing");return b; });
  }

  function handleFlipAgain() { setPhase("playing"); }
  function endSession() { setPhase("session-end"); }

  return (
    <div className="min-h-screen overflow-hidden bg-[#090605] text-white">
      <div className="fixed inset-0">
        <img src="/bg-red.png" alt="" className="h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,6,5,0.65),rgba(9,6,5,0.3)_40%,rgba(9,6,5,0.88)_100%)]" />
      </div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_68%_22%,rgba(130,82,52,0.18),transparent_22%),radial-gradient(circle_at_76%_48%,rgba(179,120,76,0.11),transparent_16%)]" />
      <img src="/toobins-r.png" alt="" className="pointer-events-none fixed right-0 top-0 h-auto w-[26rem] object-contain opacity-14 mix-blend-lighten" />
      <GoldRain active={isLegendary && phase !== "session-end"} />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 md:px-10">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="birb" className="h-8 w-auto md:h-10" />
            <div className="text-xs uppercase tracking-[0.2em] text-white/45">Flip</div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-[#ecd9ba]/15 bg-black/20 px-3 py-2 backdrop-blur-md">
              <button onClick={toggleMute} className={cn("flex h-8 w-8 items-center justify-center rounded-full transition", muted?"text-[#ecd9ba]/40":"text-[#ecd9ba]")}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {muted
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  }
                </svg>
              </button>
              <input type="range" min="0" max="0.3" step="0.005" value={muted?0:vol}
                onChange={e=>{const v=parseFloat(e.target.value);setVol(v);if(v>0&&muted)toggleMute();}}
                className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-[#ecd9ba]/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d12429]"
              />
            </div>
            <div className="rounded-full border border-[#ecd9ba]/30 bg-[#ecd9ba]/10 px-4 py-2 text-sm text-[#ecd9ba] backdrop-blur-md">SOL: F8ow...Pepn</div>
            <button className="rounded-full bg-[#d12429] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7d050d]">Disconnect</button>
          </div>
        </header>

        {/* MAIN GRID */}
        <section className="grid flex-1 gap-10 py-8 lg:grid-cols-2 lg:py-10">
          {/* LEFT — Coin */}
          <div className="order-2 flex flex-col lg:order-1">
            <div className="mb-5">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d12429]/30 bg-[#d12429]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ecd9ba]/80">Birb Flip</div>
              <h1 className="font-heading text-4xl font-black leading-[0.95] tracking-tight md:text-5xl">
                Flip for Gold.
                <span className="block bg-gradient-to-r from-white via-[#ecd9ba] to-[#d12429] bg-clip-text text-transparent">Stack your streak.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/62 md:text-base">
                Flip the BIRB coin to earn Gold — your share of the monthly reward pool. Your BIRB is always returned. Streak wins multiply your Gold rate. Lock in safely or go for legendary.
              </p>
            </div>

            <div className={cn("relative flex flex-1 flex-col items-center justify-center rounded-[2.25rem] border p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-colors duration-700",
              isLegendary ? "border-[#ffd700]/25 bg-[linear-gradient(180deg,rgba(255,215,0,0.07),rgba(255,255,255,0.02))]"
                : phase==="lose-result" ? "border-[#dc2626]/18 bg-[linear-gradient(180deg,rgba(220,38,38,0.05),rgba(255,255,255,0.02))]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
            )}>
              <AnimatePresence>
                {phase==="win-decision" && (
                  <motion.div key="wg" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    className={cn("pointer-events-none absolute inset-0 rounded-[2.25rem]",
                      isLegendary ? "bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.14),transparent_55%)]"
                        : "bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.11),transparent_55%)]"
                    )} />
                )}
                {phase==="lose-result" && (
                  <motion.div key="lg" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    className="pointer-events-none absolute inset-0 rounded-[2.25rem] bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.14),transparent_55%)]" />
                )}
              </AnimatePresence>

              <BirbCoin spinning={phase==="flipping"} result={coinResult} onDone={handleCoinDone} streak={streak} />
              <div className="mt-1 flex justify-center"><StreakBar streak={streak} /></div>

              <AnimatePresence mode="wait">
                {phase==="idle" && (
                  <motion.div key="idle" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mt-4 text-center text-sm text-white/28">Deposit BIRB to start flipping</motion.div>
                )}
                {phase==="win-decision" && (
                  <motion.div key="wd" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 w-full text-center">
                    <div className={cn("font-heading text-2xl font-black", isLegendary?"text-[#ffd700]":"text-[#22c55e]")}>Heads — you win!</div>
                    <div className="mt-1 text-sm text-white/52">{pendingStakes.length} flip streak · {pendingTotal.toLocaleString()} BIRB in play</div>
                    <div className="mt-1 text-xs text-white/38">
                      Lock in <span className="font-bold text-[#ecd9ba]">{pendingGold.toLocaleString()} Gold</span> at {currRate}x&nbsp;·&nbsp;or risk for <span className={cn("font-bold",isLegendary?"text-[#ffd700]":"text-[#f97316]")}>{nextPendingGold.toLocaleString()} Gold</span> at {nextRate}x
                    </div>
                  </motion.div>
                )}
                {phase==="lose-result" && (
                  <motion.div key="lr" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mt-4 text-center">
                    <div className="font-heading text-2xl font-black text-red-400">Tails — no Gold.</div>
                    {streak>0 && <div className="mt-1 text-sm text-white/42">×{streak} streak lost.</div>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT — Controls */}
          <div className="order-1 flex flex-col lg:order-2">
            <div className="flex flex-1 flex-col rounded-[2.2rem] border border-[#ecd9ba]/10 bg-[linear-gradient(180deg,rgba(236,217,186,0.06),rgba(236,217,186,0.02))] p-6 text-white shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl md:p-7">
              <div className="mb-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[#ecd9ba]/50">Birb Flip</div>
                <div className="mt-1 font-heading text-2xl font-black tracking-tight">Flip. Streak. Stack Gold.</div>
              </div>

              {/* Team bar */}
              {team ? (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-[#d12429]/20 bg-[#d12429]/5 px-4 py-3">
                  <a href="/teams" className="flex flex-1 items-center gap-3 transition-opacity hover:opacity-80">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d12429]/20">
                      <svg className="h-4 w-4 text-[#d12429]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#ecd9ba]">{team.name}</div>
                      <div className="text-xs text-[#ecd9ba]/50">{team.totalVolume.toLocaleString()} BIRB Volume</div>
                    </div>
                  </a>
                  <button onClick={()=>{setTeam(null);localStorage.removeItem("birb-team");}} className="rounded-lg border border-[#ecd9ba]/20 bg-[#ecd9ba]/5 px-2 py-1 text-xs text-[#ecd9ba]/60 transition-colors hover:bg-[#ecd9ba]/10 hover:text-[#ecd9ba]">Leave</button>
                </div>
              ) : (
                <a href="/teams" className="mb-4 flex items-center justify-between rounded-xl border border-[#ecd9ba]/10 bg-[#ecd9ba]/5 px-4 py-3 transition-all hover:bg-[#ecd9ba]/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ecd9ba]/10">
                      <svg className="h-4 w-4 text-[#ecd9ba]/55" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#ecd9ba]">Join a Team</div>
                      <div className="text-xs text-[#ecd9ba]/50">Compete for Top 10 rewards</div>
                    </div>
                  </div>
                  <svg className="h-4 w-4 text-[#ecd9ba]/38" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                </a>
              )}

              {/* SESSION END */}
              {phase==="session-end" ? (
                <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} className="flex flex-1 flex-col items-center justify-center gap-5 rounded-[1.8rem] border border-[#ffd700]/20 bg-[#ffd700]/4 p-6">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Session Complete</div>
                    <div className="font-heading text-5xl font-black text-[#ffd700]">{(sessionGold+bankedGold).toLocaleString()}</div>
                    <div className="text-sm text-white/48 mt-1">Gold Earned</div>
                  </div>
                  <div className="grid w-full grid-cols-3 gap-3">
                    {[{l:"BIRB Played",v:sessionDeposit.toLocaleString()},{l:"Best Streak",v:`×${sessionHighStreak}`},{l:"Flips",v:log.length.toString()}].map(x=>(
                      <div key={x.l} className="rounded-xl border border-[#ecd9ba]/10 bg-[#ecd9ba]/5 px-2 py-3 text-center">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-white/30">{x.l}</div>
                        <div className="mt-1 font-heading text-lg font-bold text-white">{x.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="w-full space-y-2.5">
                    <button onClick={()=>setShowShare(true)} className="w-full rounded-2xl bg-gradient-to-r from-[#c9920a] via-[#ffd700] to-[#c9920a] py-3.5 font-heading text-base font-bold text-black hover:brightness-110 transition">Share Your Session 🔥</button>
                    <button onClick={()=>{setPhase("idle");setBalance(0);setLog([]);}} className="w-full rounded-2xl border border-[#ecd9ba]/18 py-3 font-heading text-sm font-bold text-white/52 hover:bg-[#ecd9ba]/5 hover:text-white/78 transition">New Session</button>
                  </div>
                </motion.div>

              ) : phase==="idle" || phase==="depositing" ? (
                <div className="flex flex-1 flex-col gap-4">
                  <div className="rounded-[1.6rem] border border-[#ecd9ba]/10 bg-[linear-gradient(180deg,rgba(236,217,186,0.04),rgba(14,8,6,0.42))] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Deposit Amount</label>
                      {phase==="depositing" && (
                        <motion.div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-[#d4a06c]">
                          <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="h-3 w-3 rounded-full border border-[#d4a06c] border-t-transparent"/>
                          Processing
                        </motion.div>
                      )}
                    </div>
                    <div className="relative">
                      <input value={depositInput} onChange={e=>setDepositInput(e.target.value.replace(/\D/g,""))} disabled={phase==="depositing"}
                        className="h-14 w-full rounded-2xl border border-[#f0dcc6]/10 bg-white/5 px-4 pr-20 text-xl font-bold text-white outline-none disabled:opacity-50" placeholder="1000"/>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-white/55">BIRB</div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#d4a06c]/20 bg-[#d4a06c]/9 p-4 text-sm text-[#f0dcc6] leading-relaxed">
                    <div className="font-semibold text-[#ecd9ba] mb-1">How it works</div>
                    Your BIRB is always returned at month end. Deposit once, then flip multiple rounds from your balance. Win Gold — your proportional share of the monthly reward pool. Streak wins amplify your rate. Your deposited BIRB is never at risk.
                  </div>

                  <div className="rounded-[1.6rem] border border-[#ecd9ba]/8 bg-[linear-gradient(180deg,rgba(236,217,186,0.03),rgba(14,8,6,0.3))] p-4">
                    <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/38">Streak Gold Multipliers</div>
                    <div className="grid grid-cols-3 gap-2">
                      {STREAK_RATES.map((r,i)=>(
                        <div key={i} className="rounded-xl border border-[#ecd9ba]/8 p-2.5 text-center">
                          <div className="text-[9px] uppercase tracking-widest text-white/28">{STREAK_LABELS[i]}</div>
                          <div className={cn("mt-0.5 font-heading text-base font-bold", i>=4?"text-[#ffd700]":i>=2?"text-[#f97316]":"text-white")}>{r}x</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-[#d12429]/15 bg-[linear-gradient(180deg,rgba(209,36,41,0.04),rgba(14,8,6,0.42))] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Gold Rate Decay</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white/35">Day</span>
                        <span className="font-heading text-lg font-black text-[#d12429]">{currentDay}</span>
                        <span className="text-xs text-white/35">/ 28</span>
                      </div>
                    </div>
                    <GoldDecayCurve day={currentDay}/>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[10px] text-white/28">1</span>
                      <input type="range" min={1} max={28} value={currentDay} onChange={e=>setCurrentDay(Number(e.target.value))}
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#d12429] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d12429] [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(209,36,41,0.4)]"/>
                      <span className="text-[10px] text-white/28">28</span>
                    </div>
                    <div className="mt-2 flex justify-between text-xs">
                      <div className="text-white/38">{currentDay<=5?<span className="font-bold text-[#22c55e]">★ Grace Period — Full Rate</span>:<>Boost: <span className="font-bold text-[#d12429]">{(dayMult*100).toFixed(0)}%</span></>}</div>
                      <div className="text-white/28">{currentDay<=5?"Days 1–5 flat":currentDay<=10?"Decaying":currentDay<=18?"Moderate":"Floor rate"}</div>
                    </div>
                  </div>

                  <div className="flex-1"/>
                  <button onClick={handleDeposit} disabled={depositNum<=0||phase==="depositing"}
                    className="h-14 w-full rounded-2xl bg-[#d12429] font-heading text-base font-bold text-white transition hover:bg-[#7d050d] disabled:cursor-not-allowed disabled:opacity-50">
                    {phase==="depositing"?(
                      <span className="flex items-center justify-center gap-2">
                        <motion.span animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white"/>
                        Receiving deposit...
                      </span>
                    ):`Deposit ${depositNum>0?depositNum.toLocaleString():""} BIRB`}
                  </button>
                </div>

              ) : (
                <div className="flex flex-1 flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1.4rem] border border-[#ecd9ba]/15 bg-[#ecd9ba]/5 p-4">
                      <div className="text-[10px] uppercase tracking-[0.15em] text-white/38">Play Balance</div>
                      <div className="mt-1 font-heading text-2xl font-bold text-white">{balance.toLocaleString()}</div>
                      <div className="text-[10px] text-white/28">BIRB</div>
                    </div>
                    <div className={cn("rounded-[1.4rem] border p-4", bankedGold>0?"border-[#22c55e]/20 bg-[#22c55e]/5":"border-[#ecd9ba]/8 bg-transparent")}>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-white/38">Gold Banked</div>
                      <div className={cn("mt-1 font-heading text-2xl font-bold", bankedGold>0?"text-[#22c55e]":"text-white/28")}>{bankedGold.toLocaleString()}</div>
                      <div className="text-[10px] text-white/28">Gold</div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {pendingStakes.length>0 && (
                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                        className={cn("overflow-hidden rounded-[1.4rem] border p-4",isLegendary?"border-[#ffd700]/25 bg-[#ffd700]/7":"border-[#f97316]/18 bg-[#f97316]/5")}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-white/38">Streak Gold (at risk)</div>
                            <div className={cn("mt-1 font-heading text-xl font-bold",isLegendary?"text-[#ffd700]":"text-[#f97316]")}>{pendingGold.toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-white/30">at {currRate}x</div>
                            <div className="text-xs text-white/38">{pendingStakes.length} flip{pendingStakes.length!==1?"s":""}</div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="rounded-[1.6rem] border border-[#ecd9ba]/10 bg-[linear-gradient(180deg,rgba(236,217,186,0.04),rgba(14,8,6,0.42))] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs uppercase tracking-[0.18em] text-white/45">Stake per Flip</label>
                      <div className="font-heading text-sm font-bold text-white">{stake.toLocaleString()} BIRB</div>
                    </div>
                    <div className="mb-3 grid grid-cols-4 gap-2">
                      {[5,10,25,50].map(pct=>(
                        <button key={pct} onClick={()=>{setStakePercent(pct);setStakeInput("");}}
                          className={cn("rounded-xl border py-2 text-xs font-bold transition-all",
                            stakePercent===pct&&!stakeInput?"border-[#d12429]/38 bg-[#d12429]/14 text-white":"border-[#ecd9ba]/10 bg-transparent text-white/38 hover:text-white/65"
                          )}>{pct}%</button>
                      ))}
                    </div>
                    <div className="relative">
                      <input value={stakeInput} onChange={e=>setStakeInput(e.target.value.replace(/\D/g,""))} placeholder={`${stake.toLocaleString()} (auto)`}
                        className="h-10 w-full rounded-xl border border-[#f0dcc6]/10 bg-white/5 px-3 pr-16 text-sm font-bold text-white outline-none placeholder:text-white/18"/>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/38">BIRB</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[{l:"Gold Rate",v:`${currRate}x`,hi:true},{l:"Streak",v:streak>0?`×${streak}`:"—"},{l:"Day Boost",v:currentDay<=5?"Full":`${(dayMult*100).toFixed(0)}%`}].map(x=>(
                      <div key={x.l} className={cn("rounded-xl border px-2 py-3 text-center",x.hi?"border-[#d12429]/14 bg-[#d12429]/5":"border-[#f0dcc6]/8 bg-transparent")}>
                        <div className="text-[9px] uppercase tracking-[0.14em] text-white/38">{x.l}</div>
                        <div className={cn("mt-1 font-heading text-base font-bold",x.hi&&"text-[#d12429]")}>{x.v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1"/>

                  <AnimatePresence>
                    {phase==="win-decision" && (
                      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="grid grid-cols-2 gap-3">
                        <button onClick={handleLockIn} className="rounded-2xl border border-[#22c55e]/28 bg-[#22c55e]/9 py-4 text-center transition hover:bg-[#22c55e]/18 active:scale-[0.98]">
                          <div className="text-[9px] uppercase tracking-wider text-[#22c55e]/65 mb-1">Lock In ✓</div>
                          <div className="font-heading text-lg font-black text-[#22c55e]">{pendingGold.toLocaleString()}</div>
                          <div className="text-[10px] text-[#22c55e]/58">Gold · {currRate}x · safe</div>
                        </button>
                        <button onClick={handleFlipAgain}
                          className={cn("rounded-2xl border py-4 text-center transition active:scale-[0.98]",
                            isLegendary?"border-[#ffd700]/32 bg-[#ffd700]/9 hover:bg-[#ffd700]/18":"border-[#f97316]/25 bg-[#f97316]/9 hover:bg-[#f97316]/18"
                          )}>
                          <div className={cn("text-[9px] uppercase tracking-wider mb-1",isLegendary?"text-[#ffd700]/65":"text-[#f97316]/65")}>Flip Again 🔥</div>
                          <div className={cn("font-heading text-lg font-black",isLegendary?"text-[#ffd700]":"text-[#f97316]")}>{nextPendingGold.toLocaleString()}</div>
                          <div className={cn("text-[10px]",isLegendary?"text-[#ffd700]/55":"text-[#f97316]/55")}>Gold · {nextRate}x · risk it</div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {(phase==="playing"||phase==="lose-result") && (
                    <button onClick={handleFlip} disabled={phase!=="playing"||balance<1||stake<1}
                      className={cn("h-14 w-full rounded-2xl font-heading text-base font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]",
                        isLegendary?"bg-gradient-to-r from-[#b8860b] via-[#ffd700] to-[#b8860b] text-black hover:brightness-110 shadow-[0_0_28px_rgba(255,215,0,0.28)]"
                          :"bg-[#d12429] hover:bg-[#7d050d] shadow-[0_0_20px_rgba(209,36,41,0.2)]"
                      )}>
                      {phase==="lose-result"?"Next flip in a moment...":`Flip ${stake.toLocaleString()} BIRB`}
                    </button>
                  )}

                  {phase==="playing" && (
                    <button onClick={endSession} className="w-full rounded-2xl border border-[#ecd9ba]/14 py-2.5 text-sm font-medium text-white/42 transition hover:bg-[#ecd9ba]/5 hover:text-white/72">
                      Cash Out · {bankedGold.toLocaleString()} Gold secured
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* HISTORY */}
        {log.length>0 && (
          <section className="pb-10">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {l:"Daily Streak",v:`${dailyStreak}d`,c:"text-[#ffd700]",b:"border-[#ffd700]/18 bg-[#ffd700]/5"},
                  {l:"BIRB Played",v:totalBirb.toLocaleString(),c:"text-[#ecd9ba]",b:"border-[#ecd9ba]/18 bg-[#ecd9ba]/5"},
                  {l:"All Time Gold",v:lifetimeGold.toLocaleString(),c:"text-[#22c55e]",b:"border-[#22c55e]/18 bg-[#22c55e]/5"},
                  {l:"Win Rate",v:`${Math.round(totalWins/Math.max(totalFlips,1)*100)}%`,c:"text-[#8b5cf6]",b:"border-[#8b5cf6]/18 bg-[#8b5cf6]/5"},
                ].map(s=>(
                  <div key={s.l} className={cn("flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5",s.b)}>
                    <span className="text-[10px] uppercase tracking-wider text-white/34">{s.l}</span>
                    <span className={cn("text-xs font-bold",s.c)}>{s.v}</span>
                  </div>
                ))}
                {sessionHighStreak>=2 && (
                  <button onClick={()=>setShowShare(true)} className="flex items-center gap-1.5 rounded-xl border border-[#ffd700]/22 bg-[#ffd700]/8 px-2.5 py-1.5 text-xs font-bold text-[#ffd700] transition hover:bg-[#ffd700]/15">
                    🔥 Share ×{sessionHighStreak} streak
                  </button>
                )}
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-[#f0dcc6]/10 bg-[linear-gradient(180deg,rgba(20,14,12,0.95),rgba(14,8,6,0.98))] p-5">
                <img src="/images/birblogo-transparent.png" alt="" className="pointer-events-none absolute -right-4 bottom-0 h-28 w-auto object-contain opacity-20"/>
                <div className="relative z-10 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">Flip History</div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span className="text-[#ecd9ba]">{log.filter(l=>l.outcome!=="lose").length}W</span>
                      <span className="text-white/22">·</span>
                      <span className="text-white/40">{log.filter(l=>l.outcome==="lose").length}L</span>
                    </div>
                  </div>
                  <button onClick={()=>setLog([])} className="rounded-full border border-white/18 bg-white/[0.03] px-4 py-1.5 text-[11px] font-medium text-white/52 transition hover:border-white/30 hover:text-white/82">Reset</button>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {[...log].reverse().map((e,i)=>(
                    <div key={i} className={cn("flex-shrink-0 min-w-[88px] rounded-xl border px-3.5 py-3",
                      e.outcome==="lockin"?"border-[#22c55e]/22 bg-[#22c55e]/7":e.outcome==="win"?"border-[#ecd9ba]/18 bg-[#ecd9ba]/4":"border-white/7 bg-white/[0.018]"
                    )}>
                      <div className="text-[9px] text-white/30 mb-1.5">#{log.length-i} · {e.streak>0?`×${e.streak}`:"base"}</div>
                      <div className="text-sm font-bold text-white/62 capitalize">{e.result}</div>
                      {e.outcome==="lose"?<div className="text-[10px] font-bold uppercase tracking-wider text-red-400/62">miss</div>:<div className="text-xs font-bold text-[#ecd9ba]">+{e.gold.toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {showShare && (
          <ShareModal open={showShare} onClose={()=>setShowShare(false)} gold={sessionGold+bankedGold} deposit={sessionDeposit} highStreak={sessionHighStreak}/>
        )}
      </AnimatePresence>
    </div>
  );
}
