# Birb Flip

Gameified BIRB staking — coin flip POC. Built on the same design system as v3holocube.

## Getting Started

```bash
npm install
npm run dev
```

## Assets

Copy the following from `v3holocube/public` into `public/` here:
- `/bg-red.png`
- `/logo.png`
- `/toobins-r.png`
- `/lofi-track.mp3`
- `/images/birb-token.png`
- `/images/birb-gold.jpg`
- `/images/birblogo-transparent.png`

## Game Mechanics

**Deposit flow:** One deposit creates a play balance. Stake % per flip (5/10/25/50% or custom). Balance depletes over multiple rounds.

**Coin flip:** Heads = win, Tails = lose. 50/50 odds.

**Streak system:** Consecutive wins unlock higher Gold multipliers:
- Base: 1.8x
- ×1 streak: 2.4x
- ×2 streak: 3.4x
- ×3 streak: 5.0x
- ×4 Hot: 7.5x
- ×5 Legendary: 11.0x

**Lock In vs Flip Again:** After each win, choose to bank your Gold (safe) or risk it for the next streak multiplier.

**Gold decay:** 5-day flat grace period at 100%, then exponential decay to 35% floor by day 28 — steeper than Prism game.

**What players earn:** Gold = sum of stakes in streak × streak rate × day multiplier. BIRB always returned at month end.
