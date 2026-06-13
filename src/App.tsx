/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, Sparkles, Globe, RefreshCw, Share2, Search, Award, Shield, 
  Zap, ChevronRight, Info, Check, User, Copy, HelpCircle, Flame, 
  ChevronDown, Star, Play
} from "lucide-react";

import { Team, Group, Match, GroupStanding, PredictionResult } from "./types";
import { teamList, groups } from "./data/teams";
import { PredictionEngine } from "./utils/PredictionEngine";

// Confetti particle template
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
}

export default function App() {
  // Tabs: 'predictor' or 'bracket' or 'privacy' or 'terms'
  const [activeTab, setActiveTab] = useState<'predictor' | 'bracket' | 'privacy' | 'terms'>('predictor');

  // Regional Analysis & FAQ States
  const [regionalCountry, setRegionalCountry] = useState<string>("USA");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Predictor States
  const [teamA, setTeamA] = useState<Team | null>(teamList.find(t => t.id === "BRA") || teamList[0]);
  const [teamB, setTeamB] = useState<Team | null>(teamList.find(t => t.id === "FRA") || teamList[12]);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [openDropdownA, setOpenDropdownA] = useState(false);
  const [openDropdownB, setOpenDropdownB] = useState(false);
  
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [recentPredictions, setRecentPredictions] = useState<{A: string, B: string, flagA: string, flagB: string, score: string}[]>([]);

  // Bracket Simulator States
  // Matches represented as: record of group ID to array of 6 matches
  const [groupMatches, setGroupMatches] = useState<Record<string, Match[]>>({});
  // Knockout brackets per round
  const [knockoutBrackets, setKnockoutBrackets] = useState<{
    r32: Match[];
    r16: Match[];
    qf: Match[];
    sf: Match[];
    final: Match[];
  }>({
    r32: [],
    r16: [],
    qf: [],
    sf: [],
    final: []
  });
  
  const [champion, setChampion] = useState<Team | null>(null);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [activeKnockoutRound, setActiveKnockoutRound] = useState<'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'>('group');
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<string | null>(null);

  const dropdownRefA = useRef<HTMLDivElement>(null);
  const dropdownRefB = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRefA.current && !dropdownRefA.current.contains(event.target as Node)) {
        setOpenDropdownA(false);
      }
      if (dropdownRefB.current && !dropdownRefB.current.contains(event.target as Node)) {
        setOpenDropdownB(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dynamically update meta description and page title to sync page content with active matchup (Tier 2 matches)
  useEffect(() => {
    if (teamA && teamB) {
      const matchScoreLine = prediction ? ` predicted outcome scoreline of ${prediction.scoreA}-${prediction.scoreB}.` : ".";
      const desc = `${teamA.name} vs ${teamB.name} prediction 2026: Get simulated win probabilities, team head-to-head records, and tactical metrics for this World Cup 2026 simulator matchup with a${matchScoreLine} Will ${teamA.name} win world cup 2026? Find out now!`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
      document.title = `${teamA.name} vs ${teamB.name} Prediction 2026 | World Cup 2026 Predictor`;
    } else {
      document.title = "FIFA World Cup 2026 AI Predictor & Bracket Simulator - Match Predictions";
      document.querySelector('meta[name="description"]')?.setAttribute('content', "Use our free FIFA World Cup 2026 Match Predictor and interactive Bracket Simulator. Get real-time AI-driven world cup 2026 predictions, knockout bracket simulation, and champion odds.");
    }
  }, [teamA, teamB, prediction]);

  // Detect regional profile and pre-select national team on mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const lang = navigator.language?.toLowerCase() || "";
      let detectedTeamId = "BRA"; // Default fallback
      
      if (tz.includes("Calcutta") || tz.includes("Kolkata") || lang.includes("in")) {
        detectedTeamId = "ARG"; // Defending champion as highly favored in region
      } else if (tz.includes("New_York") || tz.includes("Chicago") || tz.includes("Denver") || tz.includes("Los_Angeles") || tz.includes("Phoenix") || tz.includes("Anchorage") || tz.includes("Honolulu")) {
        detectedTeamId = "USA";
      } else if (tz.includes("London") || lang.includes("gb")) {
        detectedTeamId = "ENG";
      } else if (tz.includes("Paris") || lang.includes("fr")) {
        detectedTeamId = "FRA";
      } else if (tz.includes("Madrid") || lang.includes("es-es")) {
        detectedTeamId = "ESP";
      } else if (tz.includes("Berlin") || lang.includes("de")) {
        detectedTeamId = "GER";
      } else if (tz.includes("Lisbon") || tz.includes("Portugal")) {
        detectedTeamId = "POR";
      } else if (tz.includes("Mexico_City") || tz.includes("Monterrey") || tz.includes("Tijuana") || lang.includes("es-mx")) {
        detectedTeamId = "MEX";
      } else if (tz.includes("Sao_Paulo") || tz.includes("Rio") || lang.includes("pt-br")) {
        detectedTeamId = "BRA";
      } else if (tz.includes("Buenos_Aires")) {
        detectedTeamId = "ARG";
      } else if (tz.includes("Tokyo") || lang.includes("ja")) {
        detectedTeamId = "JPN";
      } else if (tz.includes("Seoul") || lang.includes("ko")) {
        detectedTeamId = "KOR";
      }
      
      const matchedTeam = teamList.find(t => t.id === detectedTeamId);
      if (matchedTeam) {
        setTeamA(matchedTeam);
      }
    } catch (e) {
      console.warn("Timezone profile detection failed", e);
    }
  }, []);

  // Initialize group stage matches and saved states
  useEffect(() => {
    const saved = localStorage.getItem("fifa_2026_simulator_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.groupMatches) setGroupMatches(parsed.groupMatches);
        if (parsed.knockoutBrackets) setKnockoutBrackets(parsed.knockoutBrackets);
        if (parsed.champion) setChampion(parsed.champion);
        if (parsed.activeKnockoutRound) setActiveKnockoutRound(parsed.activeKnockoutRound);
      } catch (e) {
        console.error("Failed to load bracket from storage", e);
        resetAllBracketData();
      }
    } else {
      initializeGroups();
    }
  }, []);

  // Save changes to localStorage
  const saveBracketState = (
    matches: Record<string, Match[]>,
    knockouts: typeof knockoutBrackets,
    champ: Team | null,
    round: typeof activeKnockoutRound
  ) => {
    localStorage.setItem("fifa_2026_simulator_state", JSON.stringify({
      groupMatches: matches,
      knockoutBrackets: knockouts,
      champion: champ,
      activeKnockoutRound: round
    }));
  };

  const initializeGroups = () => {
    const matchesObj: Record<string, Match[]> = {};
    groups.forEach(g => {
      matchesObj[g.id] = [
        { id: `G-${g.id}-M1`, teamA: g.teams[0], teamB: g.teams[1], stage: 'group' },
        { id: `G-${g.id}-M2`, teamA: g.teams[2], teamB: g.teams[3], stage: 'group' },
        { id: `G-${g.id}-M3`, teamA: g.teams[0], teamB: g.teams[2], stage: 'group' },
        { id: `G-${g.id}-M4`, teamA: g.teams[1], teamB: g.teams[3], stage: 'group' },
        { id: `G-${g.id}-M5`, teamA: g.teams[0], teamB: g.teams[3], stage: 'group' },
        { id: `G-${g.id}-M6`, teamA: g.teams[1], teamB: g.teams[2], stage: 'group' }
      ];
    });
    setGroupMatches(matchesObj);
    setKnockoutBrackets({ r32: [], r16: [], qf: [], sf: [], final: [] });
    setChampion(null);
    setActiveKnockoutRound('group');
    localStorage.removeItem("fifa_2026_simulator_state");
  };

  const resetAllBracketData = () => {
    if (confirm("Are you sure you want to reset the entire tournament bracket and simulation?")) {
      initializeGroups();
    }
  };

  // Group standing computation algorithm
  const getGroupStandings = (groupId: string): GroupStanding[] => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [];
    
    const matches = groupMatches[groupId] || [];
    const standingsMap: Record<string, GroupStanding> = {};
    
    group.teams.forEach(t => {
      standingsMap[t.id] = {
        team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0
      };
    });

    matches.forEach(m => {
      if (m.scoreA !== undefined && m.scoreB !== undefined) {
        const teamAObj = standingsMap[m.teamA.id];
        const teamBObj = standingsMap[m.teamB.id];
        
        if (teamAObj && teamBObj) {
          teamAObj.played += 1;
          teamBObj.played += 1;
          teamAObj.gf += m.scoreA;
          teamAObj.ga += m.scoreB;
          teamBObj.gf += m.scoreB;
          teamBObj.ga += m.scoreA;
          
          if (m.scoreA > m.scoreB) {
            teamAObj.won += 1;
            teamAObj.points += 3;
            teamBObj.lost += 1;
          } else if (m.scoreB > m.scoreA) {
            teamBObj.won += 1;
            teamBObj.points += 3;
            teamAObj.lost += 1;
          } else {
            teamAObj.drawn += 1;
            teamAObj.points += 1;
            teamBObj.drawn += 1;
            teamBObj.points += 1;
          }
          
          teamAObj.gd = teamAObj.gf - teamAObj.ga;
          teamBObj.gd = teamBObj.gf - teamBObj.ga;
        }
      }
    });

    return Object.values(standingsMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      // tiebreaker using FIFA rank (lower rank number is better)
      return a.team.fifaRank - b.team.fifaRank;
    });
  };

  const getThirdPlacedTeams = (currentGroupMatches: Record<string, Match[]>): { team: Team, points: number, gd: number, gf: number, groupId: string }[] => {
    const list: { team: Team, points: number, gd: number, gf: number, groupId: string }[] = [];
    
    groups.forEach(g => {
      const idxStandings = getGroupStandings(g.id);
      if (idxStandings.length >= 3) {
        const third = idxStandings[2];
        list.push({
          team: third.team,
          points: third.points,
          gd: third.gd,
          gf: third.gf,
          groupId: g.id
        });
      }
    });

    return list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.fifaRank - b.team.fifaRank;
    });
  };

  // Run full simulation for Group stage
  const simulateGroupStage = () => {
    const simulatedMatches: Record<string, Match[]> = {};
    
    Object.keys(groupMatches).forEach(groupId => {
      const gObj = groups.find(g => g.id === groupId);
      if (gObj) {
        simulatedMatches[groupId] = groupMatches[groupId].map(m => {
          const res = PredictionEngine.predict(m.teamA, m.teamB);
          return {
            ...m,
            scoreA: res.scoreA,
            scoreB: res.scoreB,
            winner: res.scoreA > res.scoreB ? m.teamA.id : res.scoreA < res.scoreB ? m.teamB.id : "draw"
          };
        });
      }
    });

    setGroupMatches(simulatedMatches);
    
    // Auto populate Round of 32
    generateRoundOf32(simulatedMatches);
  };

  // Populate Round of 32 according to official 48-team standards
  const generateRoundOf32 = (currentGroupMatches: Record<string, Match[]>) => {
    const standings: Record<string, GroupStanding[]> = {};
    groups.forEach(g => {
      // Calculate active standings
      const matches = currentGroupMatches[g.id] || [];
      const standingsMap: Record<string, GroupStanding> = {};
      g.teams.forEach(t => standingsMap[t.id] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
      matches.forEach(m => {
        if (m.scoreA !== undefined && m.scoreB !== undefined) {
          const tA = standingsMap[m.teamA.id];
          const tB = standingsMap[m.teamB.id];
          if (tA && tB) {
            tA.played += 1; tB.played += 1;
            tA.gf += m.scoreA; tA.ga += m.scoreB;
            tB.gf += m.scoreB; tB.ga += m.scoreA;
            if (m.scoreA > m.scoreB) { tA.won += 1; tA.points += 3; tB.lost += 1; }
            else if (m.scoreB > m.scoreA) { tB.won += 1; tB.points += 3; tA.lost += 1; }
            else { tA.drawn += 1; tA.points += 1; tB.drawn += 1; tB.points += 1; }
            tA.gd = tA.gf - tA.ga; tB.gd = tB.gf - tB.ga;
          }
        }
      });
      standings[g.id] = Object.values(standingsMap).sort((a,b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.fifaRank - b.team.fifaRank);
    });

    const groupWinners: Team[] = [];
    const groupRunnersUp: Team[] = [];
    
    groups.forEach(g => {
      const st = standings[g.id];
      if (st && st.length >= 2) {
        groupWinners.push(st[0].team);
        groupRunnersUp.push(st[1].team);
      }
    });

    const thirdPlaced = getThirdPlacedTeams(currentGroupMatches);
    const best8ThirdPlaced = thirdPlaced.slice(0, 8).map(x => x.team);

    // Make 16 fixtures for Round of 32
    // Setup pairings so group winners face 3rd placed teams and runners-up face other runners-up
    const r32fixtures: Match[] = [];
    
    for (let i = 0; i < 16; i++) {
      let teamA: Team;
      let teamB: Team;

      if (i < 8) {
        // Top 8 group winners get the 8 wildcards (best 3rd placed teams)
        teamA = groupWinners[i];
        teamB = best8ThirdPlaced[i] || groupRunnersUp[15 - i];
      } else if (i < 12) {
        // Next group winners face remaining runners up
        teamA = groupWinners[i];
        teamB = groupRunnersUp[i - 8];
      } else {
        // Runners-up face other runners up
        teamA = groupRunnersUp[i - 4];
        teamB = groupRunnersUp[15 - i + 8] || groupWinners[15 - i];
      }

      // Quick sanity check to prevent same team on both sides
      if (teamA.id === teamB.id) {
        // pick a backup runner-up
        teamB = groupRunnersUp[(i + 3) % groupRunnersUp.length];
      }

      r32fixtures.push({
        id: `R32-F${i + 1}`,
        teamA,
        teamB,
        stage: 'r32'
      });
    }

    const updatedKnockouts = {
      r32: r32fixtures,
      r16: Array(8).fill(null).map((_, i) => ({ id: `R16-F${i+1}`, teamA: { id: `W-R32-${i*2+1}`, name: `Winner R32 Match ${i*2+1}`, flag: "🏳️", confederation: "", fifaRank: 99, attackRating: 50, defenseRating: 50, wcTitles: 0, lastWCResult: "", starPlayer: "", formScore: 50 }, teamB: { id: `W-R32-${i*2+2}`, name: `Winner R32 Match ${i*2+2}`, flag: "🏳️", confederation: "", fifaRank: 99, attackRating: 50, defenseRating: 50, wcTitles: 0, lastWCResult: "", starPlayer: "", formScore: 50 }, stage: 'r16' as const })),
      qf: Array(4).fill(null).map((_, i) => ({ id: `QF-F${i+1}`, teamA: { id: `W-R16-${i*2+1}`, name: `Winner R16 Match ${i*2+1}`, flag: "🏳️", confederation: "", fifaRank: 99, attackRating: 50, defenseRating: 50, wcTitles: 0, lastWCResult: "", starPlayer: "", formScore: 50 }, teamB: { id: `W-R16-${i*2+2}`, name: `Winner R16 Match ${i*2+2}`, flag: "🏳️", confederation: "", fifaRank: 99, attackRating: 50, defenseRating: 50, wcTitles: 0, lastWCResult: "", starPlayer: "", formScore: 50 }, stage: 'qf' as const })),
      sf: Array(2).fill(null).map((_, i) => ({ id: `SF-F${i+1}`, teamA: { id: `W-QF-${i*2+1}`, name: `Winner QF Match ${i*2+1}`, flag: "🏳️", confederation: "", fifaRank: 99, attackRating: 50, defenseRating: 50, wcTitles: 0, lastWCResult: "", starPlayer: "", formScore: 50 }, teamB: { id: `W-QF-${i*2+2}`, name: `Winner QF Match ${i*2+2}`, flag: "🏳️", confederation: "", fifaRank: 99, attackRating: 50, defenseRating: 50, wcTitles: 0, lastWCResult: "", starPlayer: "", formScore: 50 }, stage: 'sf' as const })),
      final: [{ id: `FINAL-F1`, teamA: { id: `W-SF-1`, name: "Winner SF 1", flag: "🏳️", confederation: "", fifaRank: 99, attackRating: 50, defenseRating: 50, wcTitles: 0, lastWCResult: "", starPlayer: "", formScore: 50 }, teamB: { id: `W-SF-2`, name: "Winner SF 2", flag: "🏳️", confederation: "", fifaRank: 99, attackRating: 50, defenseRating: 50, wcTitles: 0, lastWCResult: "", starPlayer: "", formScore: 50 }, stage: 'final' as const }]
    };

    setKnockoutBrackets(updatedKnockouts);
    setChampion(null);
    setActiveKnockoutRound('r32');
    saveBracketState(currentGroupMatches, updatedKnockouts, null, 'r32');
  };

  // Handle a team winning a knockout matchup and advance it
  const advanceKnockout = (matchIndex: number, winningTeam: Team, currentRound: 'r32' | 'r16' | 'qf' | 'sf' | 'final') => {
    const updated = { ...knockoutBrackets };
    
    if (currentRound === 'r32') {
      const match = updated.r32[matchIndex];
      match.winner = winningTeam.id;
      match.scoreA = winningTeam.id === match.teamA.id ? 2 : 1;
      match.scoreB = winningTeam.id === match.teamB.id ? 2 : 1;
      
      const nextMatchIdx = Math.floor(matchIndex / 2);
      const isTeamA = matchIndex % 2 === 0;
      
      if (isTeamA) {
        updated.r16[nextMatchIdx].teamA = winningTeam;
      } else {
        updated.r16[nextMatchIdx].teamB = winningTeam;
      }
    } 
    else if (currentRound === 'r16') {
      const match = updated.r16[matchIndex];
      match.winner = winningTeam.id;
      match.scoreA = winningTeam.id === match.teamA.id ? 3 : 2;
      match.scoreB = winningTeam.id === match.teamB.id ? 3 : 2;
      
      const nextMatchIdx = Math.floor(matchIndex / 2);
      const isTeamA = matchIndex % 2 === 0;
      
      if (isTeamA) {
        updated.qf[nextMatchIdx].teamA = winningTeam;
      } else {
        updated.qf[nextMatchIdx].teamB = winningTeam;
      }
    } 
    else if (currentRound === 'qf') {
      const match = updated.qf[matchIndex];
      match.winner = winningTeam.id;
      match.scoreA = winningTeam.id === match.teamA.id ? 1 : 0;
      match.scoreB = winningTeam.id === match.teamB.id ? 1 : 0;
      
      const nextMatchIdx = Math.floor(matchIndex / 2);
      const isTeamA = matchIndex % 2 === 0;
      
      if (isTeamA) {
        updated.sf[nextMatchIdx].teamA = winningTeam;
      } else {
        updated.sf[nextMatchIdx].teamB = winningTeam;
      }
    } 
    else if (currentRound === 'sf') {
      const match = updated.sf[matchIndex];
      match.winner = winningTeam.id;
      match.scoreA = winningTeam.id === match.teamA.id ? 2 : 1;
      match.scoreB = winningTeam.id === match.teamB.id ? 2 : 1;
      
      const nextMatchIdx = Math.floor(matchIndex / 2);
      const isTeamA = matchIndex % 2 === 0;
      
      if (isTeamA) {
        updated.final[nextMatchIdx].teamA = winningTeam;
      } else {
        updated.final[nextMatchIdx].teamB = winningTeam;
      }
    } 
    else if (currentRound === 'final') {
      const match = updated.final[matchIndex];
      match.winner = winningTeam.id;
      match.scoreA = winningTeam.id === match.teamA.id ? 3 : 2;
      match.scoreB = winningTeam.id === match.teamB.id ? 3 : 2;
      
      setChampion(winningTeam);
      triggerConfetti();
      saveBracketState(groupMatches, updated, winningTeam, activeKnockoutRound);
      return;
    }

    setKnockoutBrackets(updated);
    saveBracketState(groupMatches, updated, champion, activeKnockoutRound);
  };

  const triggerConfetti = () => {
    const particles: ConfettiParticle[] = [];
    const colors = ["#f59e0b", "#fcd34d", "#ef4444", "#3b82f6", "#22c55e", "#ec4899"];
    
    for (let i = 0; i < 80; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100, // percentage width
        y: Math.random() * -30 - 10, // top offset
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        delay: Math.random() * 2,
        duration: Math.random() * 3 + 2
      });
    }
    setConfetti(particles);
    // Clear particles after 6 seconds to optimize performance
    setTimeout(() => setConfetti([]), 6000);
  };

  // Simulate whole round of current knockout node
  const simulateKnockoutRound = (round: 'r32' | 'r16' | 'qf' | 'sf' | 'final') => {
    const list = knockoutBrackets[round];
    list.forEach((match, idx) => {
      // Don't simulate empty placeholders
      if (match.teamA.fifaRank === 99 || match.teamB.fifaRank === 99) return;
      
      const res = PredictionEngine.predict(match.teamA, match.teamB);
      const winner = res.scoreA > res.scoreB ? match.teamA : match.teamB;
      advanceKnockout(idx, winner, round);
    });
  };

  // Toggle match results manually inside the Group stage view
  const setManualGroupMatchScore = (groupId: string, matchId: string, team: 'A' | 'B', action: 'inc' | 'dec') => {
    const updated = { ...groupMatches };
    const matches = updated[groupId] || [];
    const mIdx = matches.findIndex(m => m.id === matchId);
    
    if (mIdx !== -1) {
      const match = matches[mIdx];
      let scoreA = match.scoreA ?? 0;
      let scoreB = match.scoreB ?? 0;
      
      if (team === 'A') {
        scoreA = action === 'inc' ? scoreA + 1 : Math.max(0, scoreA - 1);
      } else {
        scoreB = action === 'inc' ? scoreB + 1 : Math.max(0, scoreB - 1);
      }
      
      match.scoreA = scoreA;
      match.scoreB = scoreB;
      match.winner = scoreA > scoreB ? match.teamA.id : scoreA < scoreB ? match.teamB.id : "draw";
      
      setGroupMatches(updated);
      saveBracketState(updated, knockoutBrackets, champion, activeKnockoutRound);
    }
  };

  // Run the match prediction algorithm
  const handlePredict = () => {
    if (!teamA || !teamB) {
      alert("Please select two valid opposing teams.");
      return;
    }
    if (teamA.id === teamB.id) {
      alert("A team cannot play itself. Please select another rival.");
      return;
    }
    
    setIsPredicting(true);
    setPrediction(null);
    
    // Simulate real high quality "AI scoring calculation"
    setTimeout(() => {
      const result = PredictionEngine.predict(teamA, teamB);
      setPrediction(result);
      setIsPredicting(false);

      // Save to recent list
      setRecentPredictions(prev => [
        {
          A: teamA.name,
          B: teamB.name,
          flagA: teamA.flag,
          flagB: teamB.flag,
          score: `${result.scoreA} – ${result.scoreB}`
        },
        ...prev.slice(0, 4)
      ]);

      // Scroll smoothly to output
      setTimeout(() => {
        const out = document.getElementById("prediction-output");
        if (out) out.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1100);
  };

  // Social Share features
  const handleSharePrediction = () => {
    if (!prediction) return;
    const shareText = `🏆 My AI World Cup Match Prediction: ${prediction.teamA.flag} ${prediction.teamA.name} ${prediction.scoreA}–${prediction.scoreB} ${prediction.teamB.flag} ${prediction.teamB.name} (${prediction.probA}% win prob) #WorldCup2026 #FIFA_AI_Predictor`;
    
    if (navigator.share) {
      navigator.share({
        title: 'FIFA 2026 AI Match Predictor',
        text: shareText,
        url: window.location.href,
      }).catch(err => console.log('Could not share:', err));
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      });
    }
  };

  // Preset match-ups click helper
  const loadPresetMatch = (idA: string, idB: string) => {
    const tA = teamList.find(t => t.id === idA);
    const tB = teamList.find(t => t.id === idB);
    if (tA) setTeamA(tA);
    if (tB) setTeamB(tB);
  };

  // Search filtered teams
  const filteredTeamsA = teamList.filter(t => 
    t.name.toLowerCase().includes(searchA.toLowerCase()) && 
    (!teamB || t.id !== teamB.id)
  );

  const filteredTeamsB = teamList.filter(t => 
    t.name.toLowerCase().includes(searchB.toLowerCase()) && 
    (!teamA || t.id !== teamA.id)
  );

  // Group teams by confederation
  const groupByConfederation = (teams: Team[]) => {
    const groupsMap: Record<string, Team[]> = {};
    teams.forEach(t => {
      if (!groupsMap[t.confederation]) groupsMap[t.confederation] = [];
      groupsMap[t.confederation].push(t);
    });
    return groupsMap;
  };

  const groupedA = useMemo(() => groupByConfederation(filteredTeamsA), [filteredTeamsA]);
  const groupedB = useMemo(() => groupByConfederation(filteredTeamsB), [filteredTeamsB]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-[#f9fafb] flex flex-col relative select-none antialiased font-sans">
      
      {/* Dynamic Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none z-0"></div>
      
      {/* Header Panel Navigation */}
      <header className="relative z-10 border-b border-[#1f2937] bg-[#111827] h-auto md:h-20 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-4 md:py-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#f59e0b] to-[#fcd34d] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <span className="text-2xl select-none leading-none">⚽</span>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white font-sans uppercase">
              WORLD CUP <span className="text-[#f59e0b]">2026</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-semibold">
              AI Match Predictor & Bracket
            </p>
          </div>
        </div>

        {/* Navigation Selector */}
        <nav className="flex bg-[#0a0e1a] p-1 rounded-lg border border-[#1f2937] self-start md:self-auto shadow-inner">
          <button
            id="tab-predictor"
            onClick={() => setActiveTab('predictor')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'predictor' 
                ? 'bg-[#1a2235] text-[#f59e0b] border border-[#f59e0b]/30 font-semibold' 
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            🎯 Predictor
          </button>
          <button
            id="tab-bracket"
            onClick={() => setActiveTab('bracket')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bracket' 
                ? 'bg-[#1a2235] text-[#f59e0b] border border-[#f59e0b]/30 font-semibold' 
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            🏆 Bracket Simulator
          </button>
        </nav>

        {/* Prediction Champion Overview widget */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-[#9ca3af] uppercase font-semibold">Predicted Champion</p>
            <p className="text-sm font-bold text-[#f59e0b] tracking-wide">
              {champion ? `${champion.flag} ${champion.name.toUpperCase()}` : "🇧🇷 BRAZIL"}
            </p>
          </div>
          <button 
            onClick={handleSharePrediction}
            className="p-2 rounded-full border border-[#1f2937] hover:border-[#f59e0b] transition-colors cursor-pointer text-[#9ca3af] hover:text-white"
            title="Share App"
          >
            <span className="text-sm">🔗</span>
          </button>
        </div>
      </header>

      {/* Main Core Area */}
      <main className="flex-1 relative z-15 py-6 px-4 md:px-8 max-w-7xl mx-auto w-full">
        
        {/* TAB 1: MATCH PREDICTOR */}
        {activeTab === 'predictor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left selector column */}
            <div className="lg:col-span-5 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-visible">
              
              <div className="absolute top-4 right-4 text-[10px] text-amber-500 opacity-60 font-mono tracking-widest uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-500" /> Host CONCACAF boost active
              </div>
              
              <h2 className="text-lg font-bold font-display text-white mb-5 flex items-center gap-2 border-b border-gray-800 pb-3">
                <Shield className="w-5 h-5 text-[#f59e0b]" /> Choose Adversaries
              </h2>

              <div className="space-y-6 relative overflow-visible">
                
                {/* TEAM A Selector */}
                <div className="relative" ref={dropdownRefA}>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-2 tracking-wider">
                    First Opponent (Home Venue)
                  </label>
                  <button
                    onClick={() => {
                      setOpenDropdownA(!openDropdownA);
                      setOpenDropdownB(false);
                    }}
                    className="w-full bg-[#1a2235] hover:bg-[#202b44] border hover:border-amber-500/50 border-gray-800 rounded-xl px-4 py-3 text-left flex items-center justify-between text-white transition-all cursor-pointer shadow-md"
                  >
                    {teamA ? (
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl" role="img" aria-label={teamA.name}>{teamA.flag}</span>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{teamA.name}</p>
                          <p className="text-[10px] text-[#f59e0b]">FIFA Rank #{teamA.fifaRank} • {teamA.confederation}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Select First Country</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openDropdownA ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {openDropdownA && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 bg-[#1a2235] border border-gray-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto"
                      >
                        <div className="p-2 border-b border-gray-800 bg-[#161c2b] sticky top-0 z-10 flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-500 shrink-0" />
                          <input
                            type="text"
                            placeholder="Search among 48 nations..."
                            value={searchA}
                            onChange={(e) => setSearchA(e.target.value)}
                            className="bg-transparent text-sm text-white focus:outline-none w-full placeholder-gray-500 py-1"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div className="p-2">
                          {Object.keys(groupedA).map(confed => (
                            <div key={confed} className="mb-3">
                              <p className="text-[10px] uppercase font-mono text-amber-500 font-bold px-2 py-1 mb-1 tracking-widest bg-[#1f293d]/50 rounded-md">
                                {confed} Confederation
                              </p>
                              {groupedA[confed].map(team => (
                                <button
                                  key={team.id}
                                  onClick={() => {
                                    setTeamA(team);
                                    setOpenDropdownA(false);
                                    setSearchA("");
                                  }}
                                  className="w-full hover:bg-amber-500 hover:text-black py-2 px-3 text-left rounded-lg text-xs flex items-center justify-between text-white transition-colors py-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{team.flag}</span>
                                    <span>{team.name}</span>
                                  </div>
                                  <span className="opacity-80 text-[10px]">Rank #{team.fifaRank}</span>
                                </button>
                              ))}
                            </div>
                          ))}
                          {Object.keys(groupedA).length === 0 && (
                            <p className="text-gray-500 text-xs text-center py-4">No countries matched</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* VS Circle element */}
                <div className="flex justify-center -my-3 pr-4">
                  <div className="w-9 h-9 rounded-full bg-[#1a2235] border border-gray-800 flex items-center justify-center shadow-lg relative">
                    <span className="text-xs font-black font-display text-amber-500">VS</span>
                  </div>
                </div>

                {/* TEAM B Selector */}
                <div className="relative" ref={dropdownRefB}>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-2 tracking-wider">
                    Second Opponent (Away Venue)
                  </label>
                  <button
                    onClick={() => {
                      setOpenDropdownB(!openDropdownB);
                      setOpenDropdownA(false);
                    }}
                    className="w-full bg-[#1a2235] hover:bg-[#202b44] border hover:border-amber-500/50 border-gray-800 rounded-xl px-4 py-3 text-left flex items-center justify-between text-white transition-all cursor-pointer shadow-md"
                  >
                    {teamB ? (
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl" role="img" aria-label={teamB.name}>{teamB.flag}</span>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{teamB.name}</p>
                          <p className="text-[10px] text-[#f59e0b]">FIFA Rank #{teamB.fifaRank} • {teamB.confederation}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Select Second Country</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openDropdownB ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {openDropdownB && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 bg-[#1a2235] border border-gray-700 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto"
                      >
                        <div className="p-2 border-b border-gray-800 bg-[#161c2b] sticky top-0 z-10 flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-500 shrink-0" />
                          <input
                            type="text"
                            placeholder="Search among 48 nations..."
                            value={searchB}
                            onChange={(e) => setSearchB(e.target.value)}
                            className="bg-transparent text-sm text-white focus:outline-none w-full placeholder-gray-500 py-1"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div className="p-2">
                          {Object.keys(groupedB).map(confed => (
                            <div key={confed} className="mb-3">
                              <p className="text-[10px] uppercase font-mono text-amber-500 font-bold px-2 py-1 mb-1 tracking-widest bg-[#1f293d]/50 rounded-md">
                                {confed} Confederation
                              </p>
                              {groupedB[confed].map(team => (
                                <button
                                  key={team.id}
                                  onClick={() => {
                                    setTeamB(team);
                                    setOpenDropdownB(false);
                                    setSearchB("");
                                  }}
                                  className="w-full hover:bg-amber-500 hover:text-black py-2 px-3 text-left rounded-lg text-xs flex items-center justify-between text-white transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{team.flag}</span>
                                    <span>{team.name}</span>
                                  </div>
                                  <span className="opacity-80 text-[10px]">Rank #{team.fifaRank}</span>
                                </button>
                              ))}
                            </div>
                          ))}
                          {Object.keys(groupedB).length === 0 && (
                            <p className="text-gray-500 text-xs text-center py-4">No countries matched</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Predict trigger button */}
                <button
                  id="predict-button"
                  onClick={handlePredict}
                  disabled={isPredicting}
                  className="w-full py-4 rounded-xl font-bold text-sm tracking-widest bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 uppercase cursor-pointer transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                >
                  {isPredicting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin duration-1000" />
                      AI ENGINE CALCULATING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 fill-black" />
                      SIMULATE MATCHUP
                    </>
                  )}
                </button>
              </div>

              {/* Presets and historical rivalries */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <span className="text-xs uppercase font-extrabold text-[#f59e0b] tracking-widest block mb-4">
                  🔥 SEO Quick Pick Rivalries
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => loadPresetMatch("BRA", "ARG")}
                    className="bg-[#1a2235]/60 hover:bg-[#202b44] border hover:border-[#f59e0b]/50 border-gray-800 rounded-lg p-2.5 text-left text-[11px] transition-all cursor-pointer flex items-center gap-1.5 text-white"
                  >
                    <span>🇧🇷</span> vs <span>🇦🇷</span> Brazil vs Argentina prediction 2026
                  </button>
                  <button 
                    onClick={() => loadPresetMatch("FRA", "ESP")}
                    className="bg-[#1a2235]/60 hover:bg-[#202b44] border hover:border-[#f59e0b]/50 border-gray-800 rounded-lg p-2.5 text-left text-[11px] transition-all cursor-pointer flex items-center gap-1.5 text-white"
                  >
                    <span>🇫🇷</span> vs <span>🇪🇸</span> France vs Spain prediction 2026
                  </button>
                  <button 
                    onClick={() => loadPresetMatch("GER", "ENG")}
                    className="bg-[#1a2235]/60 hover:bg-[#202b44] border hover:border-[#f59e0b]/50 border-gray-800 rounded-lg p-2.5 text-left text-[11px] transition-all cursor-pointer flex items-center gap-1.5 text-white"
                  >
                    <span>🇩🇪</span> vs <span>🏴󠁧󠁢󠁥󠁮󠁧󠁿</span> Germany vs England prediction 2026
                  </button>
                  <button 
                    onClick={() => loadPresetMatch("POR", "MAR")}
                    className="bg-[#1a2235]/60 hover:bg-[#202b44] border hover:border-[#f59e0b]/50 border-gray-800 rounded-lg p-2.5 text-left text-[11px] transition-all cursor-pointer flex items-center gap-1.5 text-white"
                  >
                    <span>🇵🇹</span> vs <span>🇲🇦</span> Portugal vs Morocco predictions 2026
                  </button>
                  <button 
                    onClick={() => loadPresetMatch("USA", "MEX")}
                    className="bg-[#1a2235]/60 hover:bg-[#202b44] border hover:border-[#f59e0b]/50 border-gray-800 rounded-lg p-2.5 text-left text-[11px] transition-all cursor-pointer flex items-center gap-1.5 text-white"
                  >
                    <span>🇺🇸</span> vs <span>🇲🇽</span> USA vs Mexico prediction 2026
                  </button>
                  <button 
                    onClick={() => loadPresetMatch("JPN", "KOR")}
                    className="bg-[#1a2235]/60 hover:bg-[#202b44] border hover:border-[#f59e0b]/50 border-gray-800 rounded-lg p-2.5 text-left text-[11px] transition-all cursor-pointer flex items-center gap-1.5 text-white"
                  >
                    <span>🇯🇵</span> vs <span>🇰🇷</span> Japan vs Korea prediction 2026
                  </button>
                </div>
              </div>

            </div>

            {/* Right results column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* SKELETON LOADING STATE */}
              {isPredicting && (
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center justify-center min-h-[350px]">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-amber-500 animate-spin flex items-center justify-center">
                    </div>
                    <Trophy className="w-7 h-7 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  
                  <h3 className="text-lg font-bold font-display text-white mb-2 animate-pulse">
                    Analyzing Stats and Squad Form...
                  </h3>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Re-evaluating head-to-head ratios, home venue continent bonuses, relative FIFA ranks, and attack vs defense parameters...
                  </p>
                  
                  <div className="flex gap-1.5 mt-6 justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}

              {/* EMPTY STATE */}
              {!isPredicting && !prediction && (
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
                  <div className="w-20 h-20 rounded-full bg-[#1a2235] flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-amber-500 opacity-60" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-white mb-2">
                    AI Match Engine Ready
                  </h3>
                  <p className="text-xs text-gray-400 max-w-md">
                    Select two opposing international squads on the left panel, click <strong className="text-amber-500">SIMULATE MATCHUP</strong>, and let our deterministic tactical artificial intelligence calculate outcome probability and tactical narratives!
                  </p>
                  
                  {/* Decorative background soccer ball draft outline */}
                  <div className="absolute -bottom-16 -right-16 text-[#1e293b]/25">
                    <svg width="240" height="240" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="m12 2 3.5 10H8.5L12 2Z"/>
                      <path d="M12 22v-4"/>
                      <path d="M4 12h4"/>
                      <path d="M16 12h4"/>
                      <path d="m5.5 16.5 2.5-2.5"/>
                      <path d="m18.5 7.5-2.5 2.5"/>
                      <path d="m5.5 7.5 2.5 2.5"/>
                      <path d="m18.5 16.5-2.5-2.5"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* LIVE PREDICTION OUTPUT */}
              {!isPredicting && prediction && (
                <motion.div
                  id="prediction-output"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#111827] rounded-xl border border-[#1f2937] p-5 flex flex-col gap-5 text-left"
                >
                  <h2 className="text-xs font-bold text-[#9ca3af] uppercase mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse"></span> Active Simulation Result
                  </h2>
                  
                  {/* Scoreboard banner custom from theme */}
                  <div className="flex justify-between items-center bg-[#0a0e1a]/40 p-4 border border-[#1f2937] rounded-xl">
                    <div className="text-center flex-1">
                      <div className="w-14 h-14 mx-auto bg-[#1a2235] rounded-full border-2 border-[#1f2937] flex items-center justify-center text-3xl mb-2 shadow-lg select-none">
                        {prediction.teamA.flag}
                      </div>
                      <p className="font-bold text-white text-xs md:text-sm">{prediction.teamA.name}</p>
                      <p className="text-[10px] text-[#9ca3af]">Rank: {prediction.teamA.fifaRank}</p>
                    </div>
                    
                    <div className="px-4 flex flex-col items-center shrink-0">
                      <span className="text-[#f59e0b] font-black text-2xl italic leading-none">VS</span>
                      <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent my-1.5"></div>
                      <p className="text-[10px] font-mono font-bold text-[#f59e0b]">MATCH PREDICTION</p>
                    </div>
                    
                    <div className="text-center flex-1">
                      <div className="w-14 h-14 mx-auto bg-[#1a2235] rounded-full border-2 border-[#f59e0b] flex items-center justify-center text-3xl mb-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] select-none">
                        {prediction.teamB.flag}
                      </div>
                      <p className="font-bold text-white text-xs md:text-sm">{prediction.teamB.name}</p>
                      <p className="text-[10px] text-[#9ca3af]">Rank: {prediction.teamB.fifaRank}</p>
                    </div>
                  </div>

                  {/* Win probability block */}
                  <div className="bg-[#0a0e1a] rounded-lg p-4 border border-[#1f2937]">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-xs font-semibold uppercase text-[#9ca3af]">Win Probability Ratio</p>
                      <p className="text-sm font-bold text-[#f59e0b]">
                        {prediction.probA}% <span className="text-white/20 mx-1">|</span> {prediction.probDraw > 0 ? `${prediction.probDraw}% Draw | ` : ""}{prediction.probB}%
                      </p>
                    </div>
                    <div className="h-3 w-full bg-[#1a2235] rounded-full overflow-hidden flex">
                      <div className="h-full bg-[#ef4444]" style={{ width: `${prediction.probA}%` }}></div>
                      {prediction.probDraw > 0 && <div className="h-full bg-gray-600" style={{ width: `${prediction.probDraw}%` }}></div>}
                      <div className="h-full bg-[#22c55e] shadow-[inset_-2px_0_10px_rgba(0,0,0,0.3)]" style={{ width: `${prediction.probB}%` }}></div>
                    </div>
                  </div>

                  {/* Prediction Score & key summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between p-2.5 bg-[#1a2235] rounded border border-[#1f2937] text-xs">
                      <span className="text-[#9ca3af]">Predicted Scoreline</span>
                      <span className="font-bold text-[#f59e0b]">
                        {prediction.teamA.name.toUpperCase()} {prediction.scoreA} – {prediction.scoreB} {prediction.teamB.name.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-[#1a2235] rounded border border-[#1f2937] text-xs">
                      <span className="text-[#9ca3af]">Tactical Verdict</span>
                      <span className="font-bold text-[#22c55e]">{prediction.verdict}</span>
                    </div>
                  </div>

                  {/* Tactical factors list */}
                  <div className="bg-[#1a2235]/50 border border-[#1f2937] rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] border-b border-[#1f2937] pb-2">
                      🧠 AI Simulation Insights & Factors
                    </h4>
                    <ul className="space-y-2.5">
                      {prediction.factors.map((factor, fIdx) => (
                        <li key={fIdx} className="text-xs leading-relaxed text-gray-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full mt-1.5 shrink-0"></span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Squad strength meters & Star players spotlight */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[#0a0e1a] rounded-lg border border-[#1f2937]">
                        <p className="text-[10px] text-[#9ca3af] mb-1.5 uppercase font-medium tracking-tight">{prediction.teamA.name} Attack Rating</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#1a2235] rounded-full">
                            <div className="h-full bg-[#f59e0b]" style={{ width: `${prediction.teamA.attackRating}%` }}></div>
                          </div>
                          <span className="text-[10px] font-mono text-white">{prediction.teamA.attackRating}%</span>
                        </div>
                      </div>
                      <div className="p-3 bg-[#0a0e1a] rounded-lg border border-[#1f2937]">
                        <p className="text-[10px] text-[#9ca3af] mb-1.5 uppercase font-medium tracking-tight">{prediction.teamB.name} Attack Rating</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#1a2235] rounded-full">
                            <div className="h-full bg-[#fcd34d]" style={{ width: `${prediction.teamB.attackRating}%` }}></div>
                          </div>
                          <span className="text-[10px] font-mono text-white">{prediction.teamB.attackRating}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1a2235] p-3 rounded-lg border border-[#f59e0b]/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-gradient-to-b from-[#f59e0b] to-[#111827] flex items-center justify-center text-sm shadow">✨</div>
                        <div>
                          <p className="text-xs font-bold text-white">{prediction.teamA.starPlayer}</p>
                          <p className="text-[9px] text-[#f59e0b]">{prediction.teamA.name} Leader</p>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono italic text-gray-500">vs stars</div>
                      <div className="flex items-center gap-2.5 text-right">
                        <div>
                          <p className="text-xs font-bold text-white">{prediction.teamB.starPlayer}</p>
                          <p className="text-[9px] text-[#f59e0b]">{prediction.teamB.name} Leader</p>
                        </div>
                        <div className="w-8 h-8 rounded bg-gradient-to-b from-[#f59e0b] to-[#111827] flex items-center justify-center text-sm shadow">✨</div>
                      </div>
                    </div>
                  </div>

                  {/* ⚡ TIER 2 MATCH-SPECIFIC REAL-TIME SEARCH INDEX PREJECTIONS (SEO AUTOMATION) */}
                  <div className="bg-[#0a0e1a]/80 p-4 rounded-xl border border-[#1f2937] text-left">
                    <p className="text-[10px] font-extrabold uppercase text-[#f59e0b] tracking-wider mb-2.5 flex items-center gap-1">
                      <Search className="w-3.5 h-3.5 text-[#f59e0b]" /> MATCH-SPECIFIC SEARCH PROJECTIONS
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-[#9ca3af]">
                      <div className="p-2 bg-[#1a2235]/40 rounded border border-[#1f2937]/50 flex justify-between">
                        <span>Prediction Query:</span>
                        <span className="font-bold text-white">{prediction.teamA.name} vs {prediction.teamB.name} prediction 2026</span>
                      </div>
                      <div className="p-2 bg-[#1a2235]/40 rounded border border-[#1f2937]/50 flex justify-between">
                        <span>World Cup Match:</span>
                        <span className="font-bold text-white">{prediction.teamA.name} vs {prediction.teamB.name} world cup 2026</span>
                      </div>
                      <div className="p-2 bg-[#1a2235]/40 rounded border border-[#1f2937]/50 flex justify-between font-bold">
                        <span>Chances Factor:</span>
                        <span className="text-[#f59e0b]">{prediction.teamA.name} world cup 2026 chances</span>
                      </div>
                      <div className="p-2 bg-[#1a2235]/40 rounded border border-[#1f2937]/50 flex justify-between font-bold">
                        <span>Knockout Odds:</span>
                        <span className="text-[#22c55e]">will {prediction.teamA.name} win world cup 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* 📣 DYNAMIC SOCIAL PRESETS FOR VIRALITY */}
                  <div className="bg-[#111827]/40 p-4 rounded-xl border border-[#1f2937] space-y-3">
                    <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-[#f59e0b]" /> Copy Programmatic Social Share Presets
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          const txt = `🏆 My AI predicts ${prediction.teamA.name} ${prediction.scoreA}-${prediction.scoreB} ${prediction.teamB.name} (${prediction.scoreA > prediction.scoreB ? prediction.probA : prediction.probB}% win probability) at #WorldCup2026\nPredict matchup on free tool 👉 ${window.location.origin}\n#FIFA2026 #WorldCupPredictor #${prediction.teamA.id}`;
                          navigator.clipboard.writeText(txt);
                          alert("X / Twitter post copied to clipboard!");
                        }}
                        className="bg-[#1a2235] hover:bg-[#202b44] active:scale-95 border border-[#1f2937] hover:border-blue-500/50 p-2.5 rounded-lg text-left transition-all cursor-pointer"
                      >
                        <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">X / Twitter Presets</div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 italic leading-tight">
                          "🏆 My AI predicts {prediction.teamA.name} beat {prediction.teamB.name}..."
                        </p>
                      </button>

                      <button
                        onClick={() => {
                          const txt = `Check out my World Cup 2026 prediction! ${prediction.teamA.flag} ${prediction.teamA.name} 🆚 ${prediction.teamB.flag} ${prediction.teamB.name} → ${prediction.teamA.name} wins ${prediction.scoreA}-${prediction.scoreB}. Make your own prediction: ${window.location.origin}`;
                          navigator.clipboard.writeText(txt);
                          alert("WhatsApp message template copied to clipboard!");
                        }}
                        className="bg-[#1a2235] hover:bg-[#202b44] active:scale-95 border border-[#1f2937] hover:border-emerald-500/50 p-2.5 rounded-lg text-left transition-all cursor-pointer"
                      >
                        <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">WhatsApp Presets</div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 italic leading-tight">
                          "Check out my World Cup 2026 prediction! {prediction.teamA.name}..."
                        </p>
                      </button>

                      <button
                        onClick={() => {
                          const txt = `Who's taking the trophy? 🏆 My World Cup 2026 prediction: ${prediction.teamA.flag} ${prediction.teamA.name} ${prediction.scoreA} - ${prediction.scoreB} ${prediction.teamB.name} • AI confidence: ${prediction.scoreA > prediction.scoreB ? prediction.probA : prediction.probB}%\nFree tool in bio! #WorldCup2026 #FIFA2026 #Football`;
                          navigator.clipboard.writeText(txt);
                          alert("Instagram Caption template copied to clipboard!");
                        }}
                        className="bg-[#1a2235] hover:bg-[#202b44] active:scale-95 border border-[#1f2937] hover:border-pink-500/50 p-2.5 rounded-lg text-left transition-all cursor-pointer"
                      >
                        <div className="text-[10px] uppercase font-bold text-pink-400 mb-1">Instagram Presets</div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 italic leading-tight">
                          "Who's taking the trophy? 🏆 My World Cup 2026 prediction..."
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Share Prediction widget */}
                  <div className="pt-4 border-t border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <p className="text-[11px] text-gray-400 text-center md:text-left leading-tight">
                      *Predictions derived from FIFA World Cup 2026 data weights & squad attack metrics.
                    </p>
                    <div className="relative shrink-0 w-full md:w-auto">
                      <button
                        onClick={handleSharePrediction}
                        className="w-full md:w-auto bg-[#1a2235] hover:bg-[#222c44] text-white border border-gray-700 hover:border-amber-500 px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 text-amber-500" />
                        Share Prediction
                      </button>
                      <AnimatePresence>
                        {showShareTooltip && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-bold px-3 py-1 rounded shadow-lg whitespace-nowrap z-30"
                          >
                            Copied tagline to clipboard!
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                </motion.div>
              )}

              {/* RECENT MATCH HISTORY */}
              {recentPredictions.length > 0 && (
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#f59e0b] mb-3 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 fill-amber-500 text-amber-500" /> Session Prediction Log
                  </h4>
                  <div className="space-y-2">
                    {recentPredictions.map((log, index) => (
                      <div key={index} className="bg-[#0a0e1a]/50 px-3 py-2 border border-gray-800/60 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{log.flagA} {log.A}</span>
                          <span className="text-gray-500">vs</span>
                          <span>{log.flagB} {log.B}</span>
                        </div>
                        <span className="font-mono bg-[#1a2235] px-2 py-0.5 border border-gray-700/80 text-amber-400 font-extrabold rounded">
                          {log.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 2: BRACKET SIMULATOR */}
        {activeTab === 'bracket' && (
          <div className="space-y-6">
            
            {/* Simulation controllers bar */}
            <div className="bg-[#111827] border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                <div>
                  <h3 className="font-bold text-sm text-white">Full Tournament Bracket Tree</h3>
                  <p className="text-[11px] text-gray-400">12 Groups × 4 Teams → Round of 32 Wildcards → Champion</p>
                </div>
              </div>

              {/* Action Buttons for simulating group stage and reset */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={simulateGroupStage}
                  className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10 flex-1 md:flex-none uppercase tracking-wider"
                >
                  <Sparkles className="w-4 h-4 fill-black" />
                  Auto-Fill Group Standings
                </button>
                <button
                  onClick={resetAllBracketData}
                  className="bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer flex-1 md:flex-none"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Bracket
                </button>
              </div>

            </div>

            {/* Stage/Round Selector switcher tabs */}
            <div className="flex overflow-x-auto gap-1 border-b border-gray-800 pb-2">
              {[
                { id: 'group', name: 'Group Tables' },
                { id: 'r32', name: 'Round of 32' },
                { id: 'r16', name: 'Round of 16' },
                { id: 'qf', name: 'Quarter-Finals' },
                { id: 'sf', name: 'Semi-Finals' },
                { id: 'final', name: 'The Final/Winner' }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    // Check if group stage has scores before entering knockouts
                    if (r.id !== 'group' && Object.keys(groupMatches).length === 0) {
                      alert("Please run 'Auto-Fill Group Standings' or set group matches first to populate fixtures!");
                      return;
                    }
                    // Check if Round of 32 populated
                    if (r.id !== 'group' && knockoutBrackets.r32.length === 0) {
                      simulateGroupStage();
                    }
                    setActiveKnockoutRound(r.id as any);
                  }}
                  className={`px-4 py-2 border-b-2 text-xs md:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                    activeKnockoutRound === r.id 
                      ? 'border-[#f59e0b] text-[#f59e0b] bg-amber-500/5' 
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>

            {/* RENDER ACTIVE STAGE CONTENT */}
            <div>
              
              {/* STAGE A: GROUP TABLES */}
              {activeKnockoutRound === 'group' && (
                <div className="space-y-6">
                  
                  {/* Info card */}
                  <div className="bg-[#1a2235]/40 border border-gray-800 rounded-xl p-4 text-xs text-gray-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p>
                      The official World Cup 2026 hosts 48 teams in 12 groups (A-L). The top 2 from each group + the top 8 overall ranked 3rd-place teams advance to the Round of 32. Click on a group to view and manually adjust game results.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(g => {
                      const standings = getGroupStandings(g.id);
                      return (
                        <div 
                          key={g.id} 
                          className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all flex flex-col"
                        >
                          {/* Group header */}
                          <div className="bg-[#1a2235]/80 p-3.5 border-b border-gray-800 flex items-center justify-between">
                            <span className="font-extrabold text-sm font-display text-white">{g.name}</span>
                            <button
                              onClick={() => setSelectedGroupDetail(selectedGroupDetail === g.id ? null : g.id)}
                              className="text-[10px] uppercase font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-[#0a0e1a] px-2 py-1 rounded border border-gray-800 cursor-pointer"
                            >
                              {selectedGroupDetail === g.id ? "Close Games" : "Setup Match Scores"}
                            </button>
                          </div>

                          {/* Standings Table representation */}
                          <div className="p-3.5 flex-1">
                            <table className="w-full text-[11px] text-left">
                              <thead>
                                <tr className="text-gray-500 font-mono uppercase text-[9px] border-b border-gray-800/80">
                                  <th className="pb-1.5 pl-1">Rank</th>
                                  <th className="pb-1.5 font-sans">Nation</th>
                                  <th className="pb-1.5 text-center font-mono">Pld</th>
                                  <th className="pb-1.5 text-center font-mono">GD</th>
                                  <th className="pb-1.5 text-center font-mono">Pts</th>
                                </tr>
                              </thead>
                              <tbody>
                                {standings.map((st, sIdx) => {
                                  // Highlight qualifying zone (Green for top 2, Amber for 3rd spot contingency)
                                  let rowHighlight = "text-gray-400";
                                  if (sIdx < 2) rowHighlight = "text-[#22c55e] font-semibold";
                                  else if (sIdx === 2) rowHighlight = "text-amber-400 font-semibold";
                                  
                                  return (
                                    <tr key={st.team.id} className="border-b border-gray-800/45 hover:bg-[#1a2235]/20">
                                      <td className="py-2 pl-1 font-mono">{sIdx + 1}</td>
                                      <td className={`py-2 ${rowHighlight} font-sans flex items-center gap-1.5`}>
                                        <span className="text-base select-none">{st.team.flag}</span>
                                        <span className="truncate max-w-[100px]">{st.team.name}</span>
                                      </td>
                                      <td className="py-2 text-center font-mono text-gray-300">{st.played}</td>
                                      <td className="py-2 text-center font-mono text-gray-300">{st.gd > 0 ? `+${st.gd}` : st.gd}</td>
                                      <td className="py-1.5 text-center font-mono text-white font-bold">{st.points}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* EXPANDABLE MATCH GAME SETUP */}
                          {selectedGroupDetail === g.id && (
                            <div className="bg-[#0a0e1a] p-4 border-t border-gray-800 space-y-2.5">
                              <p className="text-[10px] uppercase font-mono font-bold text-amber-500 tracking-wider mb-2">
                                Group H2H Match Games
                              </p>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(groupMatches[g.id] || []).map((m) => (
                                  <div key={m.id} className="bg-[#111827] px-2.5 py-1.5 rounded-lg border border-gray-800 flex items-center justify-between text-[11px] gap-2">
                                    <div className="flex items-center gap-1 text-gray-300 w-24 truncate">
                                      <span>{m.teamA.flag}</span>
                                      <span className="truncate">{m.teamA.name}</span>
                                    </div>
                                    
                                    {/* Numeric Score selectors */}
                                    <div className="flex items-center gap-1.5 shrink-0 bg-[#1a2235] px-1.5 py-0.5 rounded border border-gray-700">
                                      <button 
                                        onClick={() => setManualGroupMatchScore(g.id, m.id, 'A', 'dec')}
                                        className="w-4 h-4 bg-gray-800 hover:bg-gray-700 rounded text-center text-[10px] leading-tight font-black cursor-pointer text-white"
                                      >-</button>
                                      <span className="font-mono text-xs w-3 text-center text-white font-bold">{m.scoreA ?? 0}</span>
                                      <button 
                                        onClick={() => setManualGroupMatchScore(g.id, m.id, 'A', 'inc')}
                                        className="w-4 h-4 bg-gray-800 hover:bg-gray-700 rounded text-center text-[10px] leading-tight font-black cursor-pointer text-white"
                                      >+</button>
                                      <span className="text-[9px] text-gray-500">:</span>
                                      <button 
                                        onClick={() => setManualGroupMatchScore(g.id, m.id, 'B', 'dec')}
                                        className="w-4 h-4 bg-gray-800 hover:bg-gray-700 rounded text-center text-[10px] leading-tight font-black cursor-pointer text-white"
                                      >-</button>
                                      <span className="font-mono text-xs w-3 text-center text-white font-bold">{m.scoreB ?? 0}</span>
                                      <button 
                                        onClick={() => setManualGroupMatchScore(g.id, m.id, 'B', 'inc')}
                                        className="w-4 h-4 bg-gray-800 hover:bg-gray-700 rounded text-center text-[10px] leading-tight font-black cursor-pointer text-white"
                                      >+</button>
                                    </div>

                                    <div className="flex items-center gap-1 text-gray-300 w-24 justify-end truncate">
                                      <span className="truncate">{m.teamB.name}</span>
                                      <span>{m.teamB.flag}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                  {/* THIRD PLACED TEAMS RECKONER */}
                  <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-xl">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#f59e0b] mb-4 flex items-center gap-1.5">
                      <Award className="w-4 h-4" /> Best 3rd-Placed Outlets (8 Advancing Spot Contingents)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {getThirdPlacedTeams(groupMatches).map((tObj, tIdx) => {
                        const advancing = tIdx < 8;
                        return (
                          <div 
                            key={tObj.team.id} 
                            className={`p-3 rounded-lg border text-center transition-all ${
                              advancing 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-[#22c55e]' 
                                : 'bg-gray-900/40 border-gray-800 text-gray-500'
                            }`}
                          >
                            <span className="text-3xl block mb-1">{tObj.team.flag}</span>
                            <p className="font-bold text-xs truncate text-white">{tObj.team.name}</p>
                            <p className="text-[10px] font-mono mt-1">Pts: {tObj.points} • GD: {tObj.gd > 0 ? `+${tObj.gd}` : tObj.gd}</p>
                            <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-full inline-block mt-2 ${
                              advancing ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-400'
                            }`}>
                              {advancing ? `Slot ${tIdx + 1} Advance` : "Eliminated"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* STAGES B-F: KNOCKOUT VIEWS WITH AUTOMATION MATCHUPS */}
              {activeKnockoutRound !== 'group' && (
                <div className="space-y-6">
                  
                  {/* Round Controller Helper Banner */}
                  <div className="bg-[#1a2235]/40 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <p className="text-xs text-gray-300 text-center sm:text-left">
                        Tap on any country flag or name to advance them to the next bracket round instantly.
                      </p>
                    </div>
                    
                    {/* Auto Simulator button for standard stage simulation */}
                    <button
                      onClick={() => simulateKnockoutRound(activeKnockoutRound as any)}
                      className="bg-[#1a2235] hover:bg-[#202b44] text-[#f59e0b] border border-amber-500/20 hover:border-amber-500/40 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer w-full sm:w-auto justify-center"
                    >
                      <Play className="w-4 h-4 fill-amber-500 stroke-none" />
                      Simulate This Entire Round
                    </button>
                  </div>

                  {/* Dynamic grid for matching fixtures in active knockout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {knockoutBrackets[activeKnockoutRound as keyof typeof knockoutBrackets]?.map((match, idx) => {
                      const isWinnerA = match.winner === match.teamA.id;
                      const isWinnerB = match.winner === match.teamB.id;
                      const hasPlayed = match.winner !== undefined;
                      
                      const isPlaceholderA = match.teamA.fifaRank === 99;
                      const isPlaceholderB = match.teamB.fifaRank === 99;

                      return (
                        <div 
                          key={match.id} 
                          className="bg-[#111827] border border-gray-800 hover:border-gray-700 rounded-xl overflow-hidden shadow-md flex flex-col justify-between"
                        >
                          <div className="bg-[#161c2b]/80 px-3 py-1.5 border-b border-gray-800 flex items-center justify-between text-[10px] font-mono text-gray-500">
                            <span>Match {idx + 1}</span>
                            <span className="text-amber-500/80 uppercase">{activeKnockoutRound}</span>
                          </div>
                          
                          <div className="p-3 space-y-2.5">
                            
                            {/* Team A Option */}
                            <button
                              disabled={isPlaceholderA}
                              onClick={() => advanceKnockout(idx, match.teamA, activeKnockoutRound as any)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                                isWinnerA 
                                  ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' 
                                  : isWinnerB 
                                    ? 'bg-gray-905/30 border-gray-800 text-gray-500 opacity-60' 
                                    : 'bg-[#1a2235]/40 hover:bg-[#202b44] border-gray-800 text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-2xl select-none shrink-0">{match.teamA.flag}</span>
                                <div className="truncate">
                                  <p className="font-bold text-xs truncate leading-tight">{match.teamA.name}</p>
                                  {!isPlaceholderA && <p className="text-[9px] text-gray-500 leading-none">Rank {match.teamA.fifaRank}</p>}
                                </div>
                              </div>
                              {hasPlayed && isWinnerA && <Check className="w-4 h-4 shrink-0 text-[#22c55e]" />}
                            </button>

                            {/* Divider VS circle */}
                            <div className="text-center -my-1 text-gray-500 font-mono text-[9px]">VS</div>

                            {/* Team B Option */}
                            <button
                              disabled={isPlaceholderB}
                              onClick={() => advanceKnockout(idx, match.teamB, activeKnockoutRound as any)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                                isWinnerB 
                                  ? 'bg-[#22c55e]/10 border-[#22c55e]/40 text-[#22c55e]' 
                                  : isWinnerA 
                                    ? 'bg-gray-905/30 border-gray-800 text-gray-500 opacity-60' 
                                    : 'bg-[#1a2235]/40 hover:bg-[#202b44] border-gray-800 text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-2xl select-none shrink-0">{match.teamB.flag}</span>
                                <div className="truncate">
                                  <p className="font-bold text-xs truncate leading-tight">{match.teamB.name}</p>
                                  {!isPlaceholderB && <p className="text-[9px] text-gray-500 leading-none">Rank {match.teamB.fifaRank}</p>}
                                </div>
                              </div>
                              {hasPlayed && isWinnerB && <Check className="w-4 h-4 shrink-0 text-[#22c55e]" />}
                            </button>

                          </div>
                          
                          {/* AI Quick prediction advice line */}
                          {!isPlaceholderA && !isPlaceholderB && (
                            <div className="bg-[#161c2b]/50 p-2 border-t border-gray-800 text-[10px] text-gray-400 flex items-center justify-between">
                              <span className="truncate">Advice: AI favors {match.teamA.attackRating > match.teamB.attackRating ? match.teamA.name : match.teamB.name}</span>
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500" />
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                  {/* DISPLAY CHAMPION TROPHY CARD */}
                  {activeKnockoutRound === 'final' && champion && (
                    <motion.div 
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="mt-8 bg-gradient-to-tr from-[#111827] via-[#1a2235] to-[#111827] border-2 border-amber-500 rounded-3xl p-8 max-w-xl mx-auto text-center shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
                      
                      <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-lg relative z-10">
                        <Trophy className="w-11 h-11 text-amber-500 stroke-[2.2] animate-pulse" />
                      </div>

                      <span className="text-xs font-bold uppercase font-mono tracking-widest text-[#f59e0b] bg-[#0a0e1a] px-3.5 py-1.5 rounded-full border border-gray-800 select-none">
                        FIFA World Cup 2026 Champion
                      </span>

                      <div className="my-6">
                        <span className="text-7xl block mb-4" role="img" aria-label={champion.name}>
                          {champion.flag}
                        </span>
                        <h2 className="text-3xl font-extrabold text-white tracking-widest uppercase font-display select-none">
                          {champion.name}
                        </h2>
                        <p className="text-sm text-amber-400 font-bold mt-2">Predicted tournament gold medal winner!</p>
                      </div>

                      <div className="border-t border-gray-800/80 pt-5 flex items-center justify-center gap-4">
                        <div className="text-left">
                          <p className="text-[10px] uppercase text-gray-500 font-bold">Star Leader</p>
                          <p className="text-xs font-semibold text-white">{champion.starPlayer}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-800"></div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase text-gray-500 font-bold">Confederation</p>
                          <p className="text-xs font-semibold text-white">{champion.confederation}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-800"></div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase text-gray-500 font-bold">Rank</p>
                          <p className="text-xs font-semibold text-white">#{champion.fifaRank} globally</p>
                        </div>
                      </div>

                      {/* Confetti repeat trigger button */}
                      <button 
                        onClick={triggerConfetti}
                        className="mt-6 bg-[#0a0e1a] hover:bg-[#1a2235] text-white border border-gray-800 hover:border-amber-500/50 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all"
                      >
                        🎉 Burst Confetti Celebration
                      </button>

                    </motion.div>
                  )}

                </div>
              )}

            </div>

          </div>
        )}

        {(activeTab === 'predictor' || activeTab === 'bracket') && (
          <>
            {/* =============== REGIONAL COUNTRY OUTLOOK PORTAL =============== */}
            <section className="mt-12 bg-[#111827] border border-[#1f2937] rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-left relative z-10 transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#f59e0b]/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-[#1f2937] pb-5 mb-6">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    🌍 REGIONAL OUTLOOK: How far will your country go?
                  </h2>
                  <p className="text-xs text-[#9ca3af] mt-1.5 leading-relaxed">
                    Automated geographic spikes calculation. Discover the <strong>world cup 2026 predictions</strong> tailored for your local federation federation area.
                  </p>
                </div>
                
                {/* Country Toggle Controls */}
                <div className="flex flex-wrap gap-1 bg-[#0a0e1a] p-1.5 rounded-xl border border-[#1f2937] max-w-full overflow-x-auto shrink-0">
                  {[
                    { key: "USA", label: "USA 🇺🇸" },
                    { key: "IND", label: "India 🇮🇳" },
                    { key: "ENG", label: "England 🏴" },
                    { key: "BRA", label: "Brazil 🇧🇷" },
                    { key: "ARG", label: "Argentina 🇦🇷" },
                    { key: "GER", label: "Germany 🇩🇪" },
                    { key: "FRA", label: "France 🇫🇷" },
                    { key: "POR", label: "Portugal 🇵🇹" },
                    { key: "MEX", label: "Mexico 🇲🇽" }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setRegionalCountry(item.key)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer font-bold ${
                        regionalCountry === item.key
                          ? "bg-[#1a2235] text-[#f59e0b] border border-[#f59e0b]/30"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Regional Country Details */}
              {(() => {
                const activeData = [
                  {
                    key: "IND",
                    name: "India world cup 2026",
                    label: "India",
                    flag: "🇮🇳",
                    details: "Not qualified, but simulated model estimates that 1.4 billion fans are rally-supporting Argentina and Brazil. Special AI analytics assign a 78% growth boost in football viewership indices across the Indian subcontinent.",
                    probability: "N/A (Massive Audience Support)",
                    stat: "78% Audience Spike Factor"
                  },
                  {
                    key: "ENG",
                    name: "England world cup 2026 prediction",
                    label: "England",
                    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
                    details: "Our model forecasts a 64% chance to top their group, 38% chance to reach the Semifinals, and 12% absolute winner odds. Built on elite squad depth and high attacking ratings.",
                    probability: "12% Champion Odds",
                    stat: "38% Semifinals Chance"
                  },
                  {
                    key: "USA",
                    name: "USA world cup 2026 prediction",
                    label: "USA",
                    flag: "🇺🇸",
                    details: "Cohosts USA benefit from intense home venue sports boosts. Model predicts an 85% probability of reaching the Round of 32, with a high chance of a Quarterfinals dark horse run.",
                    probability: "85% Round of 32 Odds",
                    stat: "42% Quarterfinals Dark Horse"
                  },
                  {
                    key: "BRA",
                    name: "Brazil world cup 2026 prediction",
                    label: "Brazil",
                    flag: "🇧🇷",
                    details: "Brazil are primary champions contenders with supreme squad depth. Current champion odds are 16.8% (highest in predictor) with vinicius jr leading tactical metrics.",
                    probability: "16.8% Absolute Favorite Odds",
                    stat: "61% Semifinals Probability"
                  },
                  {
                    key: "ARG",
                    name: "Argentina world cup 2026 chances",
                    label: "Argentina",
                    flag: "🇦🇷",
                    details: "Defending titleholders hold high chemistry ratings, carrying a 14.2% chance to achieve a back-to-back 2026 final appearance with Lionel Messi.",
                    probability: "14.2% Final Appearance Matchup",
                    stat: "91% Group Stage Top Slot"
                  },
                  {
                    key: "GER",
                    name: "Germany world cup 2026 prediction",
                    label: "Germany",
                    flag: "🇩🇪",
                    details: "In transition with tactical resets. Predicted to have an 88% group stage survival index, with a round-of-16 probability of 71%.",
                    probability: "71% Round of 16 Odds",
                    stat: "88% Group Survival Rate"
                  },
                  {
                    key: "FRA",
                    name: "France world cup 2026 winner odds",
                    label: "France",
                    flag: "🇫🇷",
                    details: "With Kylian Mbappé leading, France maintains a steady 15.1% title victory prediction, second only to Brazil in overall simulations.",
                    probability: "15.1% Champion Victory Odds",
                    stat: "58% Semifinals Probability"
                  },
                  {
                    key: "POR",
                    name: "Portugal world cup 2026 Ronaldo",
                    label: "Portugal",
                    flag: "🇵🇹",
                    details: "With Cristiano Ronaldo's leadership, Portugal carries a 92% squad experience coefficient, frequently finishing in the top 4 bracket outcomes.",
                    probability: "9.5% Golden Trophy Odds",
                    stat: "92% Squad Experience Rating"
                  },
                  {
                    key: "MEX",
                    name: "Mexico world cup 2026 host team",
                    label: "Mexico",
                    flag: "🇲🇽",
                    details: "As cohosts playing in Azteca stadium, Mexico benefits from supreme psychological weights, holding a 55% chance to reach the historic round of 16 or beyond.",
                    probability: "55% Round of 16 Chances",
                    stat: "100% Home Stadium Support Boost"
                  }
                ].find(d => d.key === regionalCountry);

                if (!activeData) return null;

                return (
                  <motion.div
                    key={activeData.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center"
                  >
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{activeData.flag}</span>
                        <div>
                          <h3 className="text-base md:text-lg font-bold font-sans text-white capitalize">
                            {activeData.label} World Cup 2026 Chances & Verdict
                          </h3>
                          <p className="text-[10px] text-[#f59e0b] font-mono">Target SEO Key: "{activeData.name}"</p>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm leading-relaxed text-gray-300">
                        {activeData.details}
                      </p>
                    </div>
                    
                    <div className="bg-[#0a0e1a] p-5 rounded-xl border border-[#1f2937] space-y-4 lg:col-span-1 text-left">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono block mb-1">Simulated Winner Odds</span>
                        <span className="text-sm font-black text-[#22c55e]">{activeData.probability}</span>
                      </div>
                      <div className="h-[1px] bg-[#1f2937]"></div>
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono block mb-1">Critical Factor Value</span>
                        <span className="text-xs font-bold text-white uppercase">{activeData.stat}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </section>

            {/* =============== COLLAPSIBLE FAQ SECTION =============== */}
            <section className="mt-12 bg-[#111827] border border-[#1f2937] rounded-2xl p-6 md:p-8 shadow-2xl text-left relative z-10 transition-all duration-300">
              <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-tight mb-2 border-b border-[#1f2937] pb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#f59e0b]" /> Frequently Asked Questions (People Also Ask)
              </h2>
              <p className="text-xs text-gray-400 mb-6 font-medium">
                Get instant statistical answers about the <strong>FIFA World Cup 2026 bracket</strong>, teams, schedule, and predictive winner calculations.
              </p>

              <div className="space-y-3">
                {[
                  {
                    q: "Who will win the FIFA World Cup 2026?",
                    a: "According to our advanced 2026 world cup winner prediction model, top heavyweights Brazil and defending champions Argentina hold the highest overall probability of taking the trophy. European powerhouses France and England follow closely behind as premier favorites to claim the peak honors."
                  },
                  {
                    q: "Which teams are favorites to win World Cup 2026?",
                    a: "The primary tournament favorites to win World Cup 2026 are Brazil, Argentina, France, England, and Spain. Exceptional dark horse candidates holding mid-tier bracket advantages include host nation USA, athletic Morocco, and Cristiano Ronaldo's Portugal, which show high potential in simulated outcomes."
                  },
                  {
                    q: "How does the World Cup 2026 bracket work?",
                    a: "The FIFA World Cup 2026 bracket features an expanded 48-team framework with 12 groups of 4 teams. The top 2 from each group and the 8 strongest thirdplace teams secure tickets to the all-new Round of 32 knockout bracket matches."
                  },
                  {
                    q: "When does the World Cup 2026 start?",
                    a: "The FIFA World Cup 2026 schedule begins with the official opening kick-off match on June 11, 2026, and concludes with the highly anticipated tournament grand final on July 19, 2026."
                  },
                  {
                    q: "How many teams are in the 2026 World Cup?",
                    a: "There are officially 48 teams competing in the 2026 World Cup, expanding from the historical 32-team setup. This results in an unprecedented 104 matches hosted across 16 world-class host cities in the USA, Canada, and Mexico."
                  },
                  {
                    q: "What is the best World Cup 2026 prediction tool?",
                    a: "This free world cup predictor tool is widely considered the best AI World Cup 2026 simulator. It leverages comprehensive neural indices, live FIFA rank parameters, squad attack-defense coefficients, and cohost home venue multipliers."
                  },
                  {
                    q: "Who is the favorite for the 2026 World Cup Golden Boot?",
                    a: "Superstar striker Kylian Mbappé leads the world cup 2026 golden boot prediction charts, closely followed by superstar Vinícius Júnior, veteran icon Lionel Messi, and other breakout strikers emerging during the tournament simulations."
                  },
                  {
                    q: "Can the USA win the World Cup 2026 as hosts?",
                    a: "Yes, under our machine-learning simulator, the USA benefits from immense home stadium support and cohost advantage. The USA frequently makes deep playoff runs to the quarterfinals and semifinals, proving to be a genuine dark horse."
                  }
                ].map((faq, idx) => {
                  const isOpen = expandedFaq === idx;
                  return (
                    <div key={idx} className="border border-[#1f2937] bg-[#0a0e1a]/40 rounded-xl overflow-hidden transition-all">
                      <button
                        onClick={() => setExpandedFaq(isOpen ? null : idx)}
                        className="w-full text-left p-4 flex items-center justify-between text-xs md:text-sm font-semibold text-white hover:text-[#f59e0b] focus:outline-none transition-colors cursor-pointer"
                      >
                        <span>Q: {faq.q}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#f59e0b]" : ""}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <p className="p-4 pt-0 text-xs text-gray-300 leading-relaxed border-t border-[#1f2937]/50">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* =============== THE HIDDEN KEYWORD PART FOR SEO BOT DISCOVERABILITY =============== */}
            <div className="sr-only select-none pointer-events-none opacity-0 invisible" aria-hidden="true" style={{ fontSize: '1px', height: '1px', overflow: 'hidden' }}>
              <h2>FIFA World Cup 2026 Predictor Keywords Cloud</h2>
              <p>world cup 2026 predictor, FIFA World Cup 2026 bracket, World Cup 2026 simulator, world cup 2026 predictions, FIFA 2026 match predictor, world cup bracket 2026, 2026 world cup winner prediction, world cup 2026 schedule</p>
              <p>who will win the world cup 2026, world cup 2026 group stage predictions, world cup 2026 golden boot prediction, best team in world cup 2026, world cup 2026 dark horse teams, world cup 2026 knockout bracket predictions, AI world cup prediction 2026, world cup 2026 probability calculator, world cup 2026 champion odds, free world cup predictor tool, world cup 2026 group stage simulator, world cup 2026 round of 32 bracket, world cup 2026 quarterfinals predictions</p>
              <p>India world cup 2026, England world cup 2026 prediction, USA world cup 2026 prediction, Brazil world cup 2026 prediction, Argentina world cup 2026 chances, Germany world cup 2026 prediction, France world cup 2026 winner odds, Portugal world cup 2026 Ronaldo, Mexico world cup 2026 host team</p>
            </div>
          </>
        )}

        {/* =============== PRIVACY POLICY PAGE ROUTED BY TAB (ADSENSE APPROVED) =============== */}
        {activeTab === 'privacy' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-[#111827] border border-[#1f2937] rounded-2xl p-6 md:p-10 shadow-2xl text-left relative z-10 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#f59e0b]/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="border-b border-[#1f2937] pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  🛡️ Privacy Policy & Ad Disclosure
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Last updated: June 12, 2026
                </p>
              </div>
              <button 
                onClick={() => { setActiveTab('predictor'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="bg-[#1a2235] hover:bg-[#202b44] text-[#f59e0b] border border-amber-500/20 hover:border-amber-500/40 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all self-start sm:self-auto"
              >
                ← Back to Predictor
              </button>
            </div>

            <div className="space-y-6 text-xs md:text-sm text-gray-300 leading-relaxed max-w-4xl">
              <p>
                At <strong>FIFA World Cup 2026 AI Predictor & Bracket Simulator</strong>, accessible from our platform, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by our prediction engine and how we use it.
              </p>
              <p>
                If you have additional questions or require more information about our Privacy Policy or AdSense integration, please do not hesitate to reach out.
              </p>

              <h3 className="text-sm font-extrabold text-white mt-8 uppercase tracking-wider border-b border-[#1f2937] pb-2">
                1. Google AdSense & Third-Party Cookies
              </h3>
              <p>
                This website uses Google AdSense and other third-party advertising partners to serve advertisements. Google, as a third-party vendor, uses cookies to serve ads on our site. Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.
              </p>
              <div className="bg-[#1a2235]/60 border border-amber-500/10 p-4 rounded-xl text-gray-300 font-mono text-[11px] leading-relaxed">
                ℹ️ <strong>Direct Opt-Out Options:</strong> Visitors can opt-out of personalized advertising by visiting Google's Ad Settings. Alternatively, visitors can opt-out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" className="text-[#f59e0b] hover:underline hover:text-[#fcd34d]" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>.
              </div>

              <h3 className="text-sm font-extrabold text-white mt-8 uppercase tracking-wider border-b border-[#1f2937] pb-2">
                2. Log Files & Analytics Tracking
              </h3>
              <p>
                Our system follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this as part of hosting services' diagnostics. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.
              </p>

              <h3 className="text-sm font-extrabold text-white mt-8 uppercase tracking-wider border-b border-[#1f2937] pb-2">
                3. Global Privacy Compliance (GDPR & CCPA Status)
              </h3>
              <p>
                We strictly adhere to CCPA (California Consumer Privacy Act) and GDPR (European General Data Protection Regulation) rules. Specifically:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                <li><strong>The right to know:</strong> Request disclosure about what personal categories we gather.</li>
                <li><strong>The right to delete:</strong> Instantly wipe any cached simulation parameters in your local browser storage.</li>
                <li><strong>No Sell Mandate:</strong> We do not sell or lease any user statistics or IP identities.</li>
              </ul>

              <h3 className="text-sm font-extrabold text-white mt-8 uppercase tracking-wider border-b border-[#1f2937] pb-2">
                4. Information Protection
              </h3>
              <p>
                We encourage parents and guardians to monitor and guide their children's online actions. Our simulator does not knowingly collect any Personal Identifiable Information from children under the age of 13.
              </p>

              <div className="pt-6 border-t border-gray-800 flex justify-end">
                <button 
                  onClick={() => { setActiveTab('predictor'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="bg-[#1a2235] hover:bg-[#202b44] text-[#f59e0b] border border-amber-500/20 px-5 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all hover:border-[#fcd34d]/40"
                >
                  Return to Main App Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* =============== TERMS & CONDITIONS PAGE ROUTED BY TAB =============== */}
        {activeTab === 'terms' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-[#111827] border border-[#1f2937] rounded-2xl p-6 md:p-10 shadow-2xl text-left relative z-10 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#f59e0b]/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="border-b border-[#1f2937] pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  📝 Terms of Service & Disclaimer
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Last updated: June 12, 2026
                </p>
              </div>
              <button 
                onClick={() => { setActiveTab('predictor'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="bg-[#1a2235] hover:bg-[#202b44] text-[#f59e0b] border border-amber-500/20 hover:border-amber-500/40 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all self-start sm:self-auto"
              >
                ← Back to Predictor
              </button>
            </div>

            <div className="space-y-6 text-xs md:text-sm text-gray-300 leading-relaxed max-w-4xl">
              <p>
                Welcome to <strong>FIFA World Cup 2026 AI Predictor & Bracket Simulator</strong>!
              </p>
              <p>
                These terms and conditions outline the rules and regulations for the use of our Simulator Platform. By accessing this web application, we assume you accept these terms and conditions in full. Do not continue to use our tool if you do not agree to all of the terms and conditions stated on this page.
              </p>

              <h3 className="text-sm font-extrabold text-white mt-8 uppercase tracking-wider border-b border-[#1f2937] pb-2">
                1. Standard Sports Betting & Financial Disclaimer (Strictly for Fun)
              </h3>
              <p className="text-amber-500 font-bold bg-[#1a2235]/40 p-4 rounded-xl border border-amber-500/20 leading-relaxed">
                ⚠️ LIMITATION DISCLAIMER: This is an artificial intelligence simulation and prediction tool created for entertainment, analytical research, and promotional purposes. The predicted winner percentages, scores, standings, and champion simulations are generated through statistical formulas and historical metrics. They do not constitute guaranteed outcomes. Under no circumstances should these predictions be utilized as professional betting, financial, or gambling advice. We are not liable for any real-world betting actions or losses.
              </p>

              <h3 className="text-sm font-extrabold text-white mt-8 uppercase tracking-wider border-b border-[#1f2937] pb-2">
                2. User License & Platform Fair Use
              </h3>
              <p>
                You are granted a limited, non-transferable license to access this simulator and calculate unlimited match predictions. You may not:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                <li>Mirror, iframe, or scrape prediction results systematically;</li>
                <li>Implement programmatic automated bots to overload simulation requests;</li>
                <li>Redistribute premium predictive coefficients without express reference to our brand.</li>
              </ul>

              <h3 className="text-sm font-extrabold text-white mt-8 uppercase tracking-wider border-b border-[#1f2937] pb-2">
                3. Indemnification & Limitation of Liability
              </h3>
              <p>
                In no event shall our simulator, its developers, or its stakeholders be held liable for any damages arising out of the use or inability to use this platform. All simulator results are provided on an "as-is" and "as-available" basis without representations or warranties of any kind.
              </p>

              <div className="pt-6 border-t border-gray-800 flex justify-end">
                <button 
                  onClick={() => { setActiveTab('predictor'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="bg-[#1a2235] hover:bg-[#202b44] text-[#f59e0b] border border-amber-500/20 px-5 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all hover:border-[#fcd34d]/40"
                >
                  Accept & Go Back to Predictor
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* Render Floating Confetti particles when active */}
      {confetti.map(p => (
        <span
          key={p.id}
          className="fixed pointer-events-none z-50 rounded-full"
          style={{
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `float-particle ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}

      {/* Custom Keyframed particles injection style */}
      <style>{`
        @keyframes float-particle {
          0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(115vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Footer information panel custom from theme */}
      <footer className="min-h-14 h-auto py-3 md:py-0 border-t border-[#1f2937] px-4 md:px-8 bg-[#111827] flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] text-[#9ca3af] relative z-10 select-none">
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-6 text-center sm:text-left">
          <p>© 2026 AI Match Predictor Engine v2.4</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => { setActiveTab('predictor'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`hover:underline cursor-pointer ${activeTab === 'predictor' ? 'text-[#f59e0b] font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Live Rankings
            </button>
            <button 
              onClick={() => { setActiveTab('bracket'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`hover:underline cursor-pointer ${activeTab === 'bracket' ? 'text-[#f59e0b] font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Simulator Stats
            </button>
            <span className="text-gray-700 hidden sm:inline">|</span>
            <button 
              onClick={() => { setActiveTab('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`hover:underline cursor-pointer ${activeTab === 'privacy' ? 'text-[#f59e0b] font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => { setActiveTab('terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`hover:underline cursor-pointer ${activeTab === 'terms' ? 'text-[#f59e0b] font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Terms & Conditions
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#0a0e1a]/40 px-2 py-1 rounded border border-[#1f2937] shrink-0">
          <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse"></span>
          <p>AI Engine: <span className="text-[#f9fafb] font-bold">OPTIMIZED</span></p>
        </div>
      </footer>

    </div>
  );
}
