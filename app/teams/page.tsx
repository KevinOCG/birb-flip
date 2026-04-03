"use client";
// Birb Flip — Teams Page

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const ADJECTIVES = ["Golden","Silver","Crimson","Shadow","Thunder","Iron","Flame","Frost","Storm","Neon","Jade","Cosmic","Solar","Lunar","Scarlet","Cobalt","Amber","Onyx","Inferno","Crystal"];
const NOUNS = ["Birbs","Owls","Falcons","Ravens","Eagles","Wings","Talons","Beaks","Feathers","Flocks","Hooters","Perches","Nests","Divers","Soars","Gliders","Swifts","Hawks","Kites","Doves"];

function genName() { return `${ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random()*NOUNS.length)]}`; }
function genCode() { return Math.random().toString(36).substring(2,8).toUpperCase(); }

type Team = { name: string; code: string; totalVolume: number; rank?: number; members: string[] };

const LEADERBOARD: Team[] = [
  { name: "Golden Birbs",    code: "GOLDB1", totalVolume: 284500, rank: 1,  members: ["F8ow...Pepn","3xKm...9wLp","7hJt...2mQr"] },
  { name: "Crimson Falcons", code: "CRMFL2", totalVolume: 241200, rank: 2,  members: ["9pWx...4nZv","2mKl...8rSt"] },
  { name: "Shadow Ravens",   code: "SHDRV3", totalVolume: 198800, rank: 3,  members: ["6yBn...1cXq","4kPs...7wMn","8zTm...3vLo","1aGh...5xRp"] },
  { name: "Thunder Owls",    code: "THRO14", totalVolume: 167400, rank: 4,  members: ["5nWk...9mJt"] },
  { name: "Iron Eagles",     code: "IRNE15", totalVolume: 143900, rank: 5,  members: ["3rLm...6bVx","7sKn...2pYw"] },
  { name: "Flame Hooters",   code: "FLMH16", totalVolume: 128600, rank: 6,  members: ["2xPt...8gCm"] },
  { name: "Frost Wings",     code: "FRWN17", totalVolume: 112300, rank: 7,  members: ["9mQr...4hLv","6kZn...1wSt"] },
  { name: "Storm Talons",    code: "STRT18", totalVolume: 98750,  rank: 8,  members: ["4bXp...7rMk"] },
  { name: "Neon Swifts",     code: "NNSW19", totalVolume: 87200,  rank: 9,  members: ["8vCl...3nPw","5yGt...9kBm"] },
  { name: "Jade Perches",    code: "JDPR10", totalVolume: 74500,  rank: 10, members: ["1mRx...6zKq"] },
];

export default function TeamsPage() {
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [suggestedName, setSuggestedName] = useState(() => genName());
  const [joinCode, setJoinCode] = useState("");
  const [view, setView] = useState<"board" | "create" | "join">("board");
  const [justJoined, setJustJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { const s = localStorage.getItem("birb-team"); if (s) try { setUserTeam(JSON.parse(s)); } catch { } }, []);

  function handleCreate() {
    const team: Team = { name: suggestedName, code: genCode(), totalVolume: 0, rank: undefined, members: ["F8ow...Pepn"] };
    localStorage.setItem("birb-team", JSON.stringify(team));
    setUserTeam(team); setJustJoined(true);
  }

  function handleJoin() {
    const found = LEADERBOARD.find(t => t.code.toUpperCase() === joinCode.toUpperCase().trim());
    if (!found) { setError("Team code not found. Check the code and try again."); return; }
    const team = { ...found, members: [...found.members, "F8ow...Pepn"] };
    localStorage.setItem("birb-team", JSON.stringify(team));
    setUserTeam(team); setJustJoined(true); setError("");
  }

  function handleLeave() {
    localStorage.removeItem("birb-team");
    setUserTeam(null); setJustJoined(false); setView("board");
  }

  const rankColor = (rank: number) => rank===1?"text-[#ffd700]":rank===2?"text-[#c0c0c0]":rank===3?"text-[#cd7f32]":"text-white/45";
  const rankBg = (rank: number) => rank===1?"border-[#ffd700]/25 bg-[#ffd700]/5":rank===2?"border-[#c0c0c0]/20 bg-[#c0c0c0]/4":rank===3?"border-[#cd7f32]/20 bg-[#cd7f32]/4":"border-white/8 bg-transparent";

  return (
    <div className="min-h-screen overflow-hidden bg-[#090605] text-white">
      <div className="fixed inset-0">
        <img src="/bg-red.png" alt="" className="h-full w-full object-cover opacity-35"/>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,6,5,0.65),rgba(9,6,5,0.35)_40%,rgba(9,6,5,0.9)_100%)]"/>
      </div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_65%_20%,rgba(130,82,52,0.16),transparent_22%)]"/>

      <div className="relative mx-auto max-w-4xl px-6 py-8 md:px-10">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/"><img src="/logo.png" alt="birb" className="h-8 w-auto md:h-10"/></a>
            <div className="text-xs uppercase tracking-[0.2em] text-white/45">Teams</div>
          </div>
          <a href="/" className="rounded-full border border-[#ecd9ba]/20 bg-[#ecd9ba]/5 px-4 py-2 text-sm text-[#ecd9ba]/70 hover:bg-[#ecd9ba]/10 hover:text-[#ecd9ba] transition">← Back to Flip</a>
        </header>

        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#d12429]/30 bg-[#d12429]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ecd9ba]/80">Birb Flip · Teams</div>
          <h1 className="font-heading text-3xl font-black leading-tight md:text-4xl">
            Compete together.
            <span className="block bg-gradient-to-r from-white via-[#ecd9ba] to-[#d12429] bg-clip-text text-transparent">Stack team Gold.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-white/55 leading-relaxed">
            Join or create a team to pool your BIRB volume. Top 10 teams each month earn bonus rewards. Every flip you make counts toward your team&apos;s total.
          </p>
        </div>

        {/* Current team banner */}
        <AnimatePresence>
          {userTeam && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              className={cn("mb-6 overflow-hidden rounded-[1.8rem] border p-5",
                justJoined?"border-[#22c55e]/25 bg-[#22c55e]/8":"border-[#d12429]/20 bg-[#d12429]/7"
              )}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl",justJoined?"bg-[#22c55e]/15":"bg-[#d12429]/15")}>
                    <svg className={cn("h-6 w-6",justJoined?"text-[#22c55e]":"text-[#d12429]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.15em] text-white/45 mb-0.5">{justJoined?"You joined":"Your Team"}</div>
                    <div className="font-heading text-xl font-black text-white">{userTeam.name}</div>
                    <div className="text-xs text-white/45 mt-0.5">
                      Code: <span className="font-mono font-bold text-[#ecd9ba]">{userTeam.code}</span>
                      &nbsp;·&nbsp;{userTeam.members.length} member{userTeam.members.length!==1?"s":""}
                      &nbsp;·&nbsp;{userTeam.totalVolume.toLocaleString()} BIRB volume
                    </div>
                  </div>
                </div>
                <button onClick={handleLeave} className="rounded-xl border border-[#ecd9ba]/18 bg-[#ecd9ba]/5 px-3 py-2 text-xs font-medium text-white/52 hover:bg-[#ecd9ba]/10 hover:text-white/78 transition">Leave Team</button>
              </div>
              {justJoined && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/8 px-3 py-2">
                  <svg className="h-4 w-4 flex-shrink-0 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span className="text-xs text-[#22c55e]">You&apos;re in! Every BIRB you flip now counts toward your team&apos;s monthly volume.</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab nav */}
        {!userTeam && (
          <div className="mb-6 flex gap-2">
            {[{id:"board",l:"Leaderboard"},{id:"create",l:"Create Team"},{id:"join",l:"Join by Code"}].map(tab=>(
              <button key={tab.id} onClick={()=>{setView(tab.id as "board"|"create"|"join");setError("");}}
                className={cn("rounded-full px-4 py-2 text-sm font-semibold transition-all",
                  view===tab.id?"bg-[#d12429] text-white":"border border-[#ecd9ba]/15 text-white/50 hover:text-white/80 hover:bg-[#ecd9ba]/5"
                )}>
                {tab.l}
              </button>
            ))}
          </div>
        )}

        {/* CREATE */}
        {!userTeam && view==="create" && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
            className="mb-6 rounded-[2rem] border border-[#ecd9ba]/10 bg-[linear-gradient(180deg,rgba(236,217,186,0.06),rgba(236,217,186,0.02))] p-6 backdrop-blur-xl">
            <div className="mb-5">
              <div className="text-xs uppercase tracking-[0.2em] text-[#ecd9ba]/50 mb-1">Create a new team</div>
              <div className="font-heading text-xl font-black">Your team, your name</div>
            </div>
            <div className="mb-4">
              <label className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2 block">Team Name</label>
              <div className="flex gap-2">
                <input value={suggestedName} onChange={e=>setSuggestedName(e.target.value)}
                  className="flex-1 h-12 rounded-2xl border border-[#f0dcc6]/12 bg-white/5 px-4 text-base font-bold text-white outline-none"/>
                <button onClick={()=>setSuggestedName(genName())}
                  className="h-12 rounded-2xl border border-[#ecd9ba]/15 bg-[#ecd9ba]/5 px-4 text-xs font-bold text-white/55 hover:bg-[#ecd9ba]/10 hover:text-white/80 transition whitespace-nowrap">
                  Shuffle ↻
                </button>
              </div>
            </div>
            <div className="mb-5 rounded-xl border border-[#d4a06c]/18 bg-[#d4a06c]/8 p-3 text-xs text-[#f0dcc6] leading-relaxed">
              Share your team code with friends after creating. All your BIRB volume from every flip contributes to the team leaderboard.
            </div>
            <button onClick={handleCreate} disabled={!suggestedName.trim()}
              className="w-full h-12 rounded-2xl bg-[#d12429] font-heading text-base font-bold text-white transition hover:bg-[#7d050d] disabled:opacity-50">
              Create Team
            </button>
          </motion.div>
        )}

        {/* JOIN */}
        {!userTeam && view==="join" && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
            className="mb-6 rounded-[2rem] border border-[#ecd9ba]/10 bg-[linear-gradient(180deg,rgba(236,217,186,0.06),rgba(236,217,186,0.02))] p-6 backdrop-blur-xl">
            <div className="mb-5">
              <div className="text-xs uppercase tracking-[0.2em] text-[#ecd9ba]/50 mb-1">Join an existing team</div>
              <div className="font-heading text-xl font-black">Enter your invite code</div>
            </div>
            <div className="mb-4">
              <label className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2 block">Team Code</label>
              <input value={joinCode} onChange={e=>{setJoinCode(e.target.value.toUpperCase());setError("");}}
                placeholder="e.g. GOLDB1"
                className="w-full h-12 rounded-2xl border border-[#f0dcc6]/12 bg-white/5 px-4 text-base font-bold font-mono text-white outline-none tracking-[0.3em] placeholder:tracking-normal placeholder:font-sans placeholder:text-white/22"/>
            </div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">{error}</div>}
            <button onClick={handleJoin} disabled={!joinCode.trim()}
              className="w-full h-12 rounded-2xl bg-[#d12429] font-heading text-base font-bold text-white transition hover:bg-[#7d050d] disabled:opacity-50">
              Join Team
            </button>
          </motion.div>
        )}

        {/* LEADERBOARD */}
        {(view==="board" || userTeam) && (
          <div className="space-y-2.5">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-heading text-lg font-black">Monthly Leaderboard</div>
              <div className="text-xs text-white/35 uppercase tracking-[0.15em]">By BIRB Volume</div>
            </div>
            {LEADERBOARD.map((team,i)=>{
              const isMe = userTeam?.code===team.code;
              return (
                <motion.div key={team.code}
                  initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                  className={cn("flex items-center gap-4 rounded-[1.6rem] border p-4 transition-all",
                    isMe?"border-[#d12429]/28 bg-[#d12429]/8 ring-1 ring-[#d12429]/15"
                      :team.rank&&team.rank<=3?rankBg(team.rank):"border-white/6 bg-white/[0.015]"
                  )}>
                  <div className={cn("w-8 text-center font-heading text-lg font-black",rankColor(team.rank??99))}>
                    {team.rank===1?"🥇":team.rank===2?"🥈":team.rank===3?"🥉":`#${team.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-heading text-base font-bold text-white truncate">{team.name}</div>
                      {isMe && <span className="rounded-full bg-[#d12429]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#d12429]">You</span>}
                    </div>
                    <div className="text-xs text-white/38 mt-0.5">{team.members.length} member{team.members.length!==1?"s":""}</div>
                  </div>
                  <div className="text-right">
                    <div className={cn("font-heading text-base font-bold",team.rank===1?"text-[#ffd700]":team.rank&&team.rank<=3?"text-[#ecd9ba]":"text-white/70")}>
                      {team.totalVolume.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/32 uppercase tracking-wider">BIRB</div>
                  </div>
                </motion.div>
              );
            })}

            <div className="mt-5 rounded-[1.6rem] border border-[#d4a06c]/18 bg-[#d4a06c]/7 p-4 text-xs text-[#f0dcc6] leading-relaxed">
              <div className="font-semibold text-[#ecd9ba] mb-1">How team rewards work</div>
              Top 10 teams each month receive a bonus allocation from the Juice/BIRB pool. Volume is tracked across all game modes. BIRB is always returned at month end regardless of rank. Encourage your team to flip early in the month during the grace period for maximum Gold.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
