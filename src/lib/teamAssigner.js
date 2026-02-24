/**
 * Team Assignment Algorithm
 *
 * Priority order:
 * 1. Unique Team ID grouping — players with matching IDs go together
 * 2. Skill level balancing — distribute so each team's average skill is similar
 * 3. Gender balancing — distribute genders as evenly as possible
 *
 * Max 8 players per team.
 */

/**
 * Assign players to teams.
 *
 * @param {Array} players - Array of { id, name, gender, skillLevel, uniqueTeamId }
 * @param {Array} teams - Array of { id, name, players: [] }
 * @param {number} maxPlayersPerTeam - Maximum players per team (default 8)
 * @returns {Object} Map of playerId → teamId
 */
export function assignPlayersToTeams(players, teams, maxPlayersPerTeam = 8) {
    const assignments = {}; // playerId → teamId

    // Initialize team tracking
    const teamStats = teams.map((team) => ({
        id: team.id,
        name: team.name,
        players: [...(team.players || [])],
        totalSkill: (team.players || []).reduce((sum, p) => sum + (p.skillLevel || 3), 0),
        genderCounts: countGenders(team.players || []),
    }));

    // Separate players into those with unique team IDs and those without
    const unassigned = players.filter((p) => !p.teamId);
    const grouped = {};
    const ungrouped = [];

    for (const player of unassigned) {
        if (player.uniqueTeamId && player.uniqueTeamId.trim() !== '') {
            const key = player.uniqueTeamId.trim();
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(player);
        } else {
            ungrouped.push(player);
        }
    }

    // STEP 1: Assign grouped players (by unique team ID)
    // Sort groups by size descending so larger groups get placed first
    const groups = Object.values(grouped).sort((a, b) => b.length - a.length);

    for (const group of groups) {
        // Find the team with the most capacity and lowest average skill
        const bestTeam = findBestTeamForGroup(teamStats, group, maxPlayersPerTeam);
        if (bestTeam) {
            for (const player of group) {
                assignments[player.id] = bestTeam.id;
                bestTeam.players.push(player);
                bestTeam.totalSkill += player.skillLevel || 3;
                bestTeam.genderCounts[player.gender] =
                    (bestTeam.genderCounts[player.gender] || 0) + 1;
            }
        }
    }

    // STEP 2: Assign ungrouped players — balanced by skill then gender
    // Sort by skill descending (snake draft style for balance)
    const sortedUngrouped = [...ungrouped].sort(
        (a, b) => (b.skillLevel || 3) - (a.skillLevel || 3)
    );

    for (const player of sortedUngrouped) {
        const bestTeam = findBestTeamForPlayer(teamStats, player, maxPlayersPerTeam);
        if (bestTeam) {
            assignments[player.id] = bestTeam.id;
            bestTeam.players.push(player);
            bestTeam.totalSkill += player.skillLevel || 3;
            bestTeam.genderCounts[player.gender] =
                (bestTeam.genderCounts[player.gender] || 0) + 1;
        }
    }

    return assignments;
}

/**
 * Find the best team for a group of players (unique team ID).
 * Prefers teams with: enough capacity → lowest average skill
 */
function findBestTeamForGroup(teamStats, group, maxPlayersPerTeam) {
    const groupSize = group.length;

    return teamStats
        .filter((t) => t.players.length + groupSize <= maxPlayersPerTeam)
        .sort((a, b) => {
            // Prefer teams with lower total skill (for balance)
            const avgA = a.players.length > 0 ? a.totalSkill / a.players.length : 0;
            const avgB = b.players.length > 0 ? b.totalSkill / b.players.length : 0;
            return avgA - avgB;
        })[0] || null;
}

/**
 * Find the best team for a single player.
 * Priority: under cap → lowest avg skill → most needed gender
 */
function findBestTeamForPlayer(teamStats, player, maxPlayersPerTeam) {
    const eligible = teamStats.filter(
        (t) => t.players.length < maxPlayersPerTeam
    );

    if (eligible.length === 0) return null;

    return eligible.sort((a, b) => {
        // Primary: fewest players first (even distribution)
        const countDiff = a.players.length - b.players.length;
        if (countDiff !== 0) return countDiff;

        // Secondary: lowest average skill
        const avgA = a.players.length > 0 ? a.totalSkill / a.players.length : 0;
        const avgB = b.players.length > 0 ? b.totalSkill / b.players.length : 0;
        const skillDiff = avgA - avgB;
        if (Math.abs(skillDiff) > 0.1) return skillDiff;

        // Tertiary: team that needs this gender the most
        const genderA = a.genderCounts[player.gender] || 0;
        const genderB = b.genderCounts[player.gender] || 0;
        return genderA - genderB;
    })[0];
}

function countGenders(players) {
    const counts = {};
    for (const p of players) {
        const g = p.gender || 'Unknown';
        counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
}
