window.StatsEngine = {
    safe(numerator, denominator, multiplier = 1) {
        return denominator === 0 ? 0 : (numerator / denominator) * multiplier;
    },

    per36(value, minutes) {
        return this.safe(value, minutes, 36);
    },

    TS(pts, fga, fta) {
        return this.safe(pts, 2 * (fga + 0.44 * fta), 100);
    },

    eFG(fgm, threePM, fga) {
        return this.safe(fgm + 0.5 * threePM, fga, 100);
    },

    possSimple(fga, fta, tov, orb) {
        return fga + 0.44 * fta + tov - orb;
    },

    possAdvanced(team, opp) {
        if (!opp || typeof opp.fga === 'undefined' || opp.fga === 0) {
            return Math.max(1, this.possSimple(team.fga, team.fta, team.tov, team.oreb));
        }
        const tORB_pct = this.safe(team.oreb, team.oreb + (opp.dreb || 0));
        const oORB_pct = this.safe(opp.oreb || 0, (opp.oreb || 0) + (team.dreb || 0));
        const tPoss = team.fga + 0.4 * team.fta - 1.07 * tORB_pct * (team.fga - team.fgm) + team.tov;
        const oPoss = opp.fga + 0.4 * (opp.fta || 0) - 1.07 * oORB_pct * (opp.fga - (opp.fgm || 0)) + (opp.tov || 0);
        return Math.max(1, (tPoss + oPoss) / 2);
    },

    usageRate(playerFGA, playerFTA, playerTOV, playerMin, teamMin, teamPoss) {
        const playPoss = playerFGA + 0.44 * playerFTA + playerTOV;
        return this.safe(playPoss * (teamMin / 5), playerMin * teamPoss, 100);
    },

    threePAr(threePA, totalFGA) {
        return this.safe(threePA, totalFGA);
    },

    FTr(fta, fga) {
        return this.safe(fta, fga);
    },

    astTovRatio(ast, tov) {
        return tov > 0 ? ast / tov : ast;
    },

    PIE(player, gameTotal) {
        const num = player.pts + player.fgm + player.ftm - player.fga - player.fta + player.dreb + (0.5 * player.oreb) + player.ast + player.stl + (0.5 * player.blk) - player.pf - player.tov;
        const den = gameTotal.pts + gameTotal.fgm + gameTotal.ftm - gameTotal.fga - gameTotal.fta + gameTotal.drb + (0.5 * gameTotal.orb) + gameTotal.ast + gameTotal.stl + (0.5 * gameTotal.blk) - gameTotal.pf - gameTotal.tov;
        return this.safe(num, den, 100);
    },

    EFF(pts, reb, ast, stl, blk, fga, fgm, fta, ftm, tov) {
        return (pts + reb + ast + stl + blk) - ((fga - fgm) + (fta - ftm) + tov);
    },

    gameScore(pts, fgm, fga, ftm, fta, oreb, dreb, stl, ast, blk, pf, tov) {
        return pts + 0.4 * fgm - 0.7 * fga - 0.4 * (fta - ftm) + 0.7 * oreb + 0.3 * dreb + stl + 0.7 * ast + 0.7 * blk - 0.4 * pf - tov;
    },

    hustleIndex(oreb, stl, blk, chargesTaken, minutes) {
        const raw = (oreb * 1.5) + (stl * 1.2) + (blk * 1.0) + (chargesTaken * 2.0);
        return minutes > 0 ? (raw / minutes) * 36 : raw;
    },

    dirtyWork(oreb, dreb, stl, blk, chargesTaken, deflections, minutes) {
        const raw = (oreb * 2) + (dreb * 0.5) + (stl * 1.5) + (blk * 1.5) + (chargesTaken * 3) + (deflections * 1);
        return minutes > 0 ? (raw / minutes) * 36 : raw;
    },

    consistency(effValues) {
        if (!effValues || effValues.length < 2) return null;
        const mean = effValues.reduce((a, b) => a + b, 0) / effValues.length;
        if (Math.abs(mean) < 0.01) return null;
        const variance = effValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / effValues.length;
        return Math.sqrt(variance) / Math.abs(mean);
    },

    EPC(ast, oreb, fta, teamPts, teamFtm, teamFga, teamAst) {
        const avgPtsPerAssist = teamAst > 0 ? ((teamPts - teamFtm) / teamFga) * 2 * (1 / (teamAst / (teamAst + 1))) : 2.0;
        const clampedAvg = Math.max(1.5, Math.min(2.8, avgPtsPerAssist));
        return ast * clampedAvg + oreb * 0.7 + fta * 0.4;
    },

    floorGeneral(ast, tov, min, teamMin, teamFgm, teamPoss) {
        const ratio = this.astTovRatio(ast, tov);
        const astPct = (teamFgm > 0 && min > 0) ? (ast / (((teamFgm / (teamMin || 1)) * min * 5) - (ast > teamFgm ? teamFgm : ast) || 1)) * 100 : 0;
        const tovPct = (teamPoss > 0 && min > 0) ? (tov / (((teamPoss / (teamMin || 1)) * min * 5) || 1)) * 100 : 0;
        return { 
            ratio: parseFloat(ratio.toFixed(2)), 
            astPct: parseFloat(Math.min(astPct, 100).toFixed(1)), 
            tovPct: parseFloat(Math.min(tovPct, 100).toFixed(1)) 
        };
    },
    astPct(ast, mp, tmMP, tmFGM, fgm) {
        const denom = ((mp / (tmMP / 5)) * tmFGM) - fgm;
        return this.safe(100 * ast, denom);
    },

    tovPct(tov, fga, fta) {
        return this.safe(100 * tov, fga + 0.44 * fta + tov);
    },

    orbPct(orb, mp, tmMP, tmORB, oppDRB) {
        return this.safe(100 * (orb * (tmMP / 5)), mp * (tmORB + oppDRB));
    },

    drbPct(drb, mp, tmMP, tmDRB, oppORB) {
        return this.safe(100 * (drb * (tmMP / 5)), mp * (tmDRB + oppORB));
    },

    pace(tmPoss, oppPoss, tmMP) {
        return this.safe(48 * (tmPoss + oppPoss), 2 * (tmMP / 5));
    },
    calcORtg(params) {
        const { MP, PTS, FGM, FGA, ThreePM, FTM, FTA, ORB, AST, TOV, Team_PTS, Team_FGM, Team_FGA, Team_ThreePM, Team_FTM, Team_FTA, Team_ORB, Team_AST, Team_MP, Opp_DRB } = params;
        if (MP === 0 || Team_MP === 0) return 0;
        
        const Team_ORB_Pct = (Team_ORB + Opp_DRB) > 0 ? Team_ORB / (Team_ORB + Opp_DRB) : 0;
        const Team_Play_Pct = Team_FGA > 0 ? Team_FGM / Team_FGA : 0;
        const FT_Scoring = FTA > 0 ? (1 - Math.pow(1 - (FTM / FTA), 2)) * 0.4 * FTA : 0;
        const Team_FT_Scoring = Team_FTA > 0 ? (1 - Math.pow(1 - (Team_FTM / Team_FTA), 2)) * 0.4 * Team_FTA : 0;
        const Team_Scoring_Poss = Team_FGM + Team_FT_Scoring;
        const Team_ORB_Weight = Team_Scoring_Poss > 0 ? ((1 - Team_ORB_Pct) * Team_Play_Pct) / ((1 - Team_ORB_Pct) * Team_Play_Pct + Team_ORB_Pct * (1 - Team_Play_Pct)) : 0;
        
        const qAST_t1 = (MP / (Team_MP / 5)) * (1.14 * ((Team_AST - AST) / (Team_FGM || 1)));
        const qAST_t2 = ((((Team_AST / Team_MP) * MP * 5 - AST) / ((Team_FGM / Team_MP) * MP * 5 - FGM || 1)) * (1 - (MP / (Team_MP / 5))));
        const qAST = Math.min(Math.max(qAST_t1 + qAST_t2, 0), 1) || 0;
        
        const FG_Part = FGM * (1 - 0.5 * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
        const AST_Part = 0.5 * (((Team_PTS - Team_FTM) - (PTS - FTM)) / (2 * (Team_FGA - FGA) || 1)) * AST;
        const ScPoss_Factor = Team_Scoring_Poss > 0 ? 1 - (Team_ORB / Team_Scoring_Poss) * Team_ORB_Weight * Team_Play_Pct : 1;
        const ScPoss = (FG_Part + AST_Part + FT_Scoring) * ScPoss_Factor + ORB * Team_ORB_Weight * Team_Play_Pct;
        const FGxPoss = (FGA - FGM) * (1 - 1.07 * Team_ORB_Pct);
        const FTxPoss = Math.pow(1 - (FTM / (FTA || 1)), 2) * 0.4 * FTA;
        const TotPoss = ScPoss + FGxPoss + FTxPoss + TOV;
        
        const PProd_FG = 2 * (FGM + 0.5 * ThreePM) * (1 - 0.5 * ((PTS - FTM) / (2 * FGA || 1)) * qAST);
        const PProd_AST = 2 * ((Team_FGM - FGM + 0.5 * (Team_ThreePM - ThreePM)) / (Team_FGM - FGM || 1)) * 0.5 * (((Team_PTS - Team_FTM) - (PTS - FTM)) / (2 * (Team_FGA - FGA) || 1)) * AST;
        const Team_Pts_Per_Score = Team_Scoring_Poss > 0 ? Team_PTS / Team_Scoring_Poss : 2;
        const PProd_ORB = ORB * Team_ORB_Weight * Team_Play_Pct * Team_Pts_Per_Score;
        const PProd = (PProd_FG + PProd_AST + FTM) * ScPoss_Factor + PProd_ORB;
        
        return TotPoss > 0 ? 100 * (PProd / TotPoss) : 0;
    },

    calcDRtg(params) {
        const { MP, STL, BLK, DRB, PF, Team_DRB, Team_STL, Team_BLK, Team_PF, Team_FGA, Team_FTA, Team_ORB, Team_TOV, Team_MP, Opp_PTS, Opp_FGM, Opp_FGA, Opp_FTM, Opp_FTA, Opp_ORB, Opp_TOV, Opp_MP } = params;
        if (MP === 0 || Team_MP === 0) return 0;
        
        const Team_Poss = Team_FGA + 0.44 * Team_FTA - Team_ORB + Team_TOV;
        const DOR_Pct = (Opp_ORB + Team_DRB) > 0 ? Opp_ORB / (Opp_ORB + Team_DRB) : 0;
        const DFG_Pct = Opp_FGA > 0 ? Opp_FGM / Opp_FGA : 0.45;
        const FMwt_D = DFG_Pct * (1 - DOR_Pct);
        const FMwt = (FMwt_D + (1 - DFG_Pct) * DOR_Pct) > 0 ? FMwt_D / (FMwt_D + (1 - DFG_Pct) * DOR_Pct) : 0.5;
        
        const Stops1 = STL + BLK * FMwt * (1 - 1.07 * DOR_Pct) + DRB * (1 - FMwt);
        const Stops2_P1 = Team_MP > 0 ? ((Opp_FGA - Opp_FGM - Team_BLK) / Team_MP) * FMwt * (1 - 1.07 * DOR_Pct) : 0;
        const Stops2_P2 = Team_MP > 0 ? ((Opp_TOV - Team_STL) / Team_MP) : 0;
        const Stops2_P3 = Team_PF > 0 && Opp_FTA > 0 ? (PF / Team_PF) * 0.4 * Opp_FTA * Math.pow(1 - (Opp_FTM / Opp_FTA), 2) : 0;
        const Stops = Stops1 + (Stops2_P1 + Stops2_P2) * MP + Stops2_P3;
        
        const Stop_Pct = (Team_Poss * MP) > 0 ? (Stops * (Opp_MP || Team_MP)) / (Team_Poss * MP) : 0;
        const Team_DRtg = Team_Poss > 0 ? 100 * (Opp_PTS / Team_Poss) : 100;
        const Opp_FT_Scoring = Opp_FTA > 0 ? (1 - Math.pow(1 - (Opp_FTM / Opp_FTA), 2)) * 0.4 * Opp_FTA : 0;
        const D_Pts_per_ScPoss = (Opp_FGM + Opp_FT_Scoring) > 0 ? Opp_PTS / (Opp_FGM + Opp_FT_Scoring) : 2;
        
        return Team_DRtg + 0.2 * (100 * D_Pts_per_ScPoss * (1 - Stop_Pct) - Team_DRtg);
    },

    applyFormationWeight(rawRating, teamRating, playerMin, totalTeamMin, activeCount, k) {
        const Min_moy = totalTeamMin / (activeCount || 5);
        const C = k * Min_moy;
        const w = playerMin / (playerMin + C);
        return teamRating + (rawRating - teamRating) * w;
    },

    OIS(pts, ast, oreb, fte, tov) {
        return pts + (ast * 1.5) + (oreb * 1.2) + (fte * 1.2) - (tov * 1.5);
    },

    DIS(stl, blk, dreb, fouls, plusMinus) {
        return (stl * 2) + (blk * 2) + dreb - (fouls * 0.7) + (plusMinus * 0.3);
    },

    impactTotal(ois, dis, minutes) {
        return this.safe(ois + dis, minutes, 40);
    },

    playerNetRtg(plusMinus, poss, playerMin, teamMin) {
        const playerPoss = poss * (playerMin / (teamMin / 5));
        return this.safe(plusMinus, playerPoss, 100);
    },

    estimateOpponent(pts) {
        return {
            fgm: Math.round(pts * 0.42),
            fga: Math.round(pts * 1.10),
            ftm: Math.round(pts * 0.18),
            fta: Math.round(pts * 0.24),
            oreb: Math.round(pts * 0.15),
            dreb: Math.round(pts * 0.3),
            reb: Math.round(pts * 0.45),
            tov: Math.round(pts * 0.12),
            fouls: 0,
            ast: 0,
            blk: 0
        };
    }
};