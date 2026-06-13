import { Team, PredictionResult } from '../types';

// Simple helper to generate a seeded random number [0, 1) based on a string
function getSeededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

// Sigmoid function to scale differences smoothly
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export class PredictionEngine {
  static getH2HMultiplier(teamA: Team, teamB: Team): { scoreA: number, scoreB: number, text: string } {
    const pair = [teamA.id, teamB.id].sort().join('-');
    
    switch (pair) {
      case 'ARG-BRA':
        return { 
          scoreA: teamA.id === 'ARG' ? 1.05 : 0.95, 
          scoreB: teamB.id === 'BRA' ? 1.05 : 0.95,
          text: "Superclásico de las Américas: Argentina vs Brazil always brings maximum rivalry and historic tension." 
        };
      case 'ENG-GER':
        return { 
          scoreA: teamA.id === 'GER' ? 1.08 : 0.92, 
          scoreB: teamB.id === 'ENG' ? 1.08 : 0.92,
          text: "Historic Anglo-German rivalry: Germany has historically held the psychological edge in major tournament bouts." 
        };
      case 'ESP-FRA':
        return { 
          scoreA: teamA.id === 'ESP' ? 1.03 : 0.97, 
          scoreB: teamB.id === 'FRA' ? 1.03 : 0.97,
          text: "European Giants Clash: Spain's tactical passing style collides with France's raw athleticism and squad depth." 
        };
      case 'GER-NED':
        return { 
          scoreA: teamA.id === 'GER' ? 1.04 : 0.96, 
          scoreB: teamB.id === 'NED' ? 1.04 : 0.96,
          text: "Border Battle: Germany vs Netherlands is one of Europe's most passionate and competitive rivalries." 
        };
      case 'MEX-USA':
        return { 
          scoreA: teamA.id === 'USA' ? 1.06 : 0.94, 
          scoreB: teamB.id === 'MEX' ? 1.06 : 0.94,
          text: "CONCACAF Derby: USA and Mexico battle for North American supremacy in a high-stakes host-nation showdown." 
        };
      case 'ENG-FRA':
        return { 
          scoreA: teamA.id === 'FRA' ? 1.04 : 0.96, 
          scoreB: teamB.id === 'ENG' ? 1.04 : 0.96,
          text: "The Channel Duel: England and France bring rich history, golden generations, other-worldly squad depth." 
        };
      case 'ITA-URU':
        return {
          scoreA: teamA.id === 'ITA' ? 1.02 : 0.98,
          scoreB: teamB.id === 'URU' ? 1.02 : 0.98,
          text: "Defensive Masterclass: Italy's strategic discipline versus Uruguay's legendary 'Garra Charrúa' physical grit."
        };
      default:
        return { scoreA: 1.0, scoreB: 1.0, text: "" };
    }
  }

  static predict(teamA: Team, teamB: Team, sessionSeedModifier: number = 0.5): PredictionResult {
    const sortedPair = [teamA.id, teamB.id].sort().join('-');
    const deterministicSeed = sortedPair;
    
    // Seeded random calculation so same match gives custom but deterministic output
    const rand1 = getSeededRandom(deterministicSeed + "-rand1");
    const rand2 = getSeededRandom(deterministicSeed + "-rand2");
    
    // 1. FIFA Rank Score (Rank 1 is best, so invert)
    // Map rank to 0-100 range. Top teams get closer to 100.
    const rankScoreA = Math.max(10, 100 - teamA.fifaRank * 1.5);
    const rankScoreB = Math.max(10, 100 - teamB.fifaRank * 1.5);

    // 2. WC History Score (Weighted based on titles and last WC result)
    const getHistoryScore = (t: Team) => {
      let score = t.wcTitles * 25; // 25pts per title
      if (t.lastWCResult === 'Winner') score += 50;
      else if (t.lastWCResult === 'Runner-up') score += 40;
      else if (t.lastWCResult === 'SF') score += 30;
      else if (t.lastWCResult === 'QF') score += 20;
      else if (t.lastWCResult === 'R16') score += 10;
      return Math.min(100, score);
    };
    const histScoreA = getHistoryScore(teamA);
    const histScoreB = getHistoryScore(teamB);

    // 3. Form Score (incorporating slight session randomness for dynamic simulation feel while keeping matchup realistic)
    const formA = Math.max(40, Math.min(100, teamA.formScore + (rand1 - 0.5) * 8));
    const formB = Math.max(40, Math.min(100, teamB.formScore + (rand2 - 0.5) * 8));

    // 4. Head-to-Head Scoring
    const h2h = this.getH2HMultiplier(teamA, teamB);

    // 5. CONCACAF Home Continent Bonus (Small boost since 2026 in NA)
    const homeBonusA = teamA.confederation === 'CONCACAF' ? 4 : 0;
    const homeBonusB = teamB.confederation === 'CONCACAF' ? 4 : 0;

    // Base ratings score
    const squadA = (teamA.attackRating * 0.55 + teamA.defenseRating * 0.45);
    const squadB = (teamB.attackRating * 0.55 + teamB.defenseRating * 0.45);

    // Score Calculation:
    // Formula weight: Rank (30%), WC History (20%), Form/Tactics (20%), Squad Rating (30%)
    const scoreA_raw = (rankScoreA * 0.3) + (histScoreA * 0.2) + (formA * 0.2) + (squadA * 0.3) + homeBonusA;
    const scoreB_raw = (rankScoreB * 0.3) + (histScoreB * 0.2) + (formB * 0.2) + (squadB * 0.3) + homeBonusB;

    // Apply H2H
    const finalScoreA = scoreA_raw * h2h.scoreA;
    const finalScoreB = scoreB_raw * h2h.scoreB;

    const diff = (finalScoreA - finalScoreB) / 10; // Scale down for sigmoid input
    const winProbA_raw = sigmoid(diff);
    
    // Draw probability calculation (maximum 28%, base around 15-25% depending on close index)
    const absDiff = Math.abs(finalScoreA - finalScoreB);
    const probDraw = Math.max(12, Math.min(28, 30 - absDiff * 0.8));
    
    // Scale remaining probability between A and B
    const remainingProb = 100 - probDraw;
    const probA = Math.round(winProbA_raw * remainingProb);
    const probB = Math.round((1 - winProbA_raw) * remainingProb);
    const finalProbDraw = Math.round(probDraw);

    // Correct rounding to ensure they sum to 100
    const sum = probA + probB + finalProbDraw;
    const adjustment = 100 - sum;

    // Add adjustment to favorite or draw
    let finalProbA = probA;
    let finalProbB = probB;
    if (adjustment !== 0) {
      if (finalProbA > finalProbB) {
        finalProbA += adjustment;
      } else {
        finalProbB += adjustment;
      }
    }

    // 6. Scoreline Generation (derived from attack Ratings and defense Ratings)
    // Base goals based on attack efficiency vs defense penalty
    const baseGoalsA = Math.max(0, (teamA.attackRating - teamB.defenseRating) / 12 + 1.2);
    const baseGoalsB = Math.max(0, (teamB.attackRating - teamA.defenseRating) / 12 + 1.2);

    // Apply seeded variance to get integer goals
    const randVarA = getSeededRandom(deterministicSeed + "-goalsA");
    const randVarB = getSeededRandom(deterministicSeed + "-goalsB");

    let goalsA = Math.floor(baseGoalsA + (randVarA - 0.5) * 1.5);
    let goalsB = Math.floor(baseGoalsB + (randVarB - 0.5) * 1.5);

    // Bounds checking
    if (goalsA < 0) goalsA = 0;
    if (goalsB < 0) goalsB = 0;
    if (goalsA > 6) goalsA = 4; // realistic cap
    if (goalsB > 6) goalsB = 4;

    // Match goals to probability
    if (finalProbA > finalProbB + 10 && goalsA <= goalsB) {
      goalsA = goalsB + Math.max(1, Math.floor(randVarA * 2));
    } else if (finalProbB > finalProbA + 10 && goalsB <= goalsA) {
      goalsB = goalsA + Math.max(1, Math.floor(randVarB * 2));
    } else if (Math.abs(finalProbA - finalProbB) <= 10 && goalsA !== goalsB) {
      // Very close probability, high chance of draw or 1 goal margin
      if (randVarA > 0.6) {
        goalsA = goalsB; // Force draw score
      }
    }

    // Factors and qualitative commentary
    const factors: string[] = [];
    if (h2h.text) {
      factors.push(h2h.text);
    }

    // Analyze dynamic variables
    if (teamA.fifaRank < teamB.fifaRank) {
      factors.push(`${teamA.name} holds the superiority in world standing, ranking at #${teamA.fifaRank} compared to ${teamB.name}'s Rank #${teamB.fifaRank}.`);
    } else {
      factors.push(`${teamB.name} carries a higher FIFA Global Ranking (#${teamB.fifaRank}) over ${teamA.name} (#${teamA.fifaRank}).`);
    }

    if (teamA.wcTitles > teamB.wcTitles) {
      factors.push(`${teamA.name}'s grand pedigree of ${teamA.wcTitles} World Cup Championships provides mental resilience and rich tournament legacy.`);
    } else if (teamB.wcTitles > teamA.wcTitles) {
      factors.push(`${teamB.name} is armed with a prestigious history of ${teamB.wcTitles} trophy victories, a key championship advantage in elite stages.`);
    }

    if (teamA.attackRating > teamB.defenseRating + 5) {
      factors.push(`Offensive mismatch: ${teamA.name}'s dynamic attack rating of ${teamA.attackRating} is expected to test and breach ${teamB.name}'s low-block defense (${teamB.defenseRating}).`);
    } else if (teamB.attackRating > teamA.defenseRating + 5) {
      factors.push(`Surgical threat: ${teamB.name}'s sharp attacking front (${teamB.attackRating}) will heavily exploit gaps in ${teamA.name}'s defensive lines (${teamA.defenseRating}).`);
    }

    if (homeBonusA > 0) {
      factors.push(`Home Turf Lift: ${teamA.name} benefits from the roaring local CONCACAF home crowd support, boosting team morale and physical output.`);
    }
    if (homeBonusB > 0) {
      factors.push(`Host Advantage: ${teamB.name} gains from the North American atmosphere, a vital external energy boost.`);
    }

    if (formA > formB + 5) {
      factors.push(`Current Momentum: ${teamA.name} is experiencing a superior squad form trend recently (${Math.round(formA)} vs ${Math.round(formB)}).`);
    } else if (formB > formA + 5) {
      factors.push(`Peak Fitness: ${teamB.name} enters this matchup on a blistering hot streak, displaying better offensive coordination and high-press stamina.`);
    }

    if (factors.length < 3) {
      factors.push(`Squad star power matchup: Spotlighting ${teamA.starPlayer} (${teamA.name}) against the pivotal playmaker ${teamB.starPlayer} (${teamB.name}).`);
    }

    let verdict = "";
    if (goalsA > goalsB) {
      verdict = `${teamA.name.toUpperCase()} WINS`;
    } else if (goalsB > goalsA) {
      verdict = `${teamB.name.toUpperCase()} WINS`;
    } else {
      verdict = "MATCH ENDING IN A DRAW";
    }

    return {
      teamA,
      teamB,
      probA: finalProbA,
      probDraw: finalProbDraw,
      probB: finalProbB,
      scoreA: goalsA,
      scoreB: goalsB,
      factors: factors.slice(0, 4), // max 4 factors
      verdict
    };
  }
}
