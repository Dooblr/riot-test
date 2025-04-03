import { useState, useEffect } from 'react';
import { 
  fetchSummonerInfo, 
  fetchMatchHistory, 
  fetchMatchDetails, 
  SummonerInfo, 
  Match, 
  Participant 
} from '../services/riotApi';
import './UserStats.scss';

export default function UserStats() {
  const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageKDA: { kills: 0, deaths: 0, assists: 0 },
    favoriteChampions: [] as { name: string; games: number; wins: number }[],
    averageCS: 0,
    averageGold: 0,
    averageDamage: 0,
    averageVision: 0
  });

  useEffect(() => {
    const loadUserStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch summoner info
        const summoner = await fetchSummonerInfo('SwagMuff1n #NA1');
        if (!summoner) {
          throw new Error('Summoner not found');
        }
        setSummonerInfo(summoner);

        // Fetch match history
        const matchHistory = await fetchMatchHistory(summoner.puuid, 20);
        
        // Fetch match details
        const matchDetails = await Promise.all(
          matchHistory.matches.map(matchId => fetchMatchDetails(matchId))
        );
        
        const validMatches = matchDetails.filter((match): match is Match => match !== null);
        setMatches(validMatches);

        // Calculate stats
        const participantStats = validMatches.map(match => 
          match.info.participants.find(p => p.puuid === summoner.puuid)
        ).filter((p): p is Participant => p !== undefined);

        const totalGames = participantStats.length;
        const wins = participantStats.filter(p => p.win).length;
        const losses = totalGames - wins;
        const winRate = (wins / totalGames) * 100;

        const totalKills = participantStats.reduce((sum, p) => sum + p.kills, 0);
        const totalDeaths = participantStats.reduce((sum, p) => sum + p.deaths, 0);
        const totalAssists = participantStats.reduce((sum, p) => sum + p.assists, 0);

        const championStats = participantStats.reduce((acc, p) => {
          const existing = acc.find(c => c.name === p.championName);
          if (existing) {
            existing.games++;
            if (p.win) existing.wins++;
          } else {
            acc.push({
              name: p.championName,
              games: 1,
              wins: p.win ? 1 : 0
            });
          }
          return acc;
        }, [] as { name: string; games: number; wins: number }[]);

        const favoriteChampions = championStats
          .sort((a, b) => b.games - a.games)
          .slice(0, 5);

        const averageCS = participantStats.reduce((sum, p) => sum + p.totalMinionsKilled, 0) / totalGames;
        const averageGold = participantStats.reduce((sum, p) => sum + p.goldEarned, 0) / totalGames;
        const averageDamage = participantStats.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0) / totalGames;
        const averageVision = participantStats.reduce((sum, p) => sum + p.visionScore, 0) / totalGames;

        setStats({
          totalGames,
          wins,
          losses,
          winRate,
          averageKDA: {
            kills: totalKills / totalGames,
            deaths: totalDeaths / totalGames,
            assists: totalAssists / totalGames
          },
          favoriteChampions,
          averageCS,
          averageGold,
          averageDamage,
          averageVision
        });
      } catch (err) {
        setError('Failed to load user stats');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadUserStats();
  }, []);

  if (loading) {
    return <div className="loading">Loading user stats...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!summonerInfo) {
    return <div className="error">Summoner not found</div>;
  }

  return (
    <div className="user-stats">
      <div className="summoner-header">
        <img 
          src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${summonerInfo.profileIconId}.png`}
          alt="Profile Icon"
          className="profile-icon"
        />
        <div className="summoner-info">
          <h2>{summonerInfo.name}</h2>
          <p>Level {summonerInfo.summonerLevel}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Win Rate</h3>
          <div className="stat-value">
            {stats.winRate.toFixed(1)}%
            <span className="stat-detail">
              {stats.wins}W {stats.losses}L
            </span>
          </div>
        </div>

        <div className="stat-card">
          <h3>KDA</h3>
          <div className="stat-value">
            {stats.averageKDA.kills.toFixed(1)} / {stats.averageKDA.deaths.toFixed(1)} / {stats.averageKDA.assists.toFixed(1)}
          </div>
        </div>

        <div className="stat-card">
          <h3>CS</h3>
          <div className="stat-value">
            {stats.averageCS.toFixed(1)}
          </div>
        </div>

        <div className="stat-card">
          <h3>Gold</h3>
          <div className="stat-value">
            {Math.round(stats.averageGold).toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <h3>Damage</h3>
          <div className="stat-value">
            {Math.round(stats.averageDamage).toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <h3>Vision</h3>
          <div className="stat-value">
            {stats.averageVision.toFixed(1)}
          </div>
        </div>
      </div>

      <div className="favorite-champions">
        <h3>Favorite Champions</h3>
        <div className="champion-list">
          {stats.favoriteChampions.map(champion => (
            <div key={champion.name} className="champion-item">
              <img 
                src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${champion.name}.png`}
                alt={champion.name}
                className="champion-icon"
              />
              <div className="champion-info">
                <span className="champion-name">{champion.name}</span>
                <span className="champion-stats">
                  {champion.wins}W {champion.games - champion.wins}L
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="recent-matches">
        <h3>Recent Matches</h3>
        <div className="match-list">
          {matches.slice(0, 5).map(match => {
            const participant = match.info.participants.find(p => p.puuid === summonerInfo.puuid);
            if (!participant) return null;

            return (
              <div key={match.metadata.matchId} className={`match-item ${participant.win ? 'win' : 'loss'}`}>
                <div className="match-champion">
                  <img 
                    src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${participant.championName}.png`}
                    alt={participant.championName}
                  />
                </div>
                <div className="match-details">
                  <div className="match-kda">
                    {participant.kills}/{participant.deaths}/{participant.assists}
                  </div>
                  <div className="match-cs">
                    {participant.totalMinionsKilled} CS
                  </div>
                </div>
                <div className="match-result">
                  {participant.win ? 'Victory' : 'Defeat'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 