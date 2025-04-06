export const API_KEY = 'RGAPI-a481a9af-9630-45d9-b02f-ae2a328bd9a7'; // RIOT APY KEY DO NOT REMOVE THIS LINE
export const REGION = 'na1';

interface ChampionInfo {
  freeChampionIds: number[];
  freeChampionIdsForNewPlayers: number[];
  maxNewPlayerLevel: number;
}

interface Champion {
  id: string;
  key: string;
  name: string;
  title: string;
  image: {
    full: string;
  };
  tags: string[]; // Champion roles/tags like "Fighter", "Tank", etc.
}

export interface ChampionData {
  id: string;
  key: string;
  name: string;
  title: string;
  imageUrl: string;
  roles: string[]; // Added roles field
}

export interface ServerStatus {
  name: string;
  status: 'online' | 'offline' | 'unstable';
  incidents: Incident[];
  ping: number;
}

export interface Incident {
  id: number;
  title: string;
  severity: 'warning' | 'critical' | 'info';
  created_at: string;
  updated_at: string;
  platforms: string[];
  description: string;
}

// Common function to get latest version
const getLatestVersion = async (): Promise<string> => {
  try {
    const versionResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await versionResponse.json();
    return versions[0];
  } catch (error) {
    console.error('Error fetching versions:', error);
    // Fallback to a recent version if API fails
    return '13.24.1';
  }
};

export const fetchFreeRotation = async (): Promise<ChampionData[]> => {
  try {
    // Get free rotation champion IDs
    const rotationResponse = await fetch(
      `https://${REGION}.api.riotgames.com/lol/platform/v3/champion-rotations?api_key=${API_KEY}`
    );
    
    if (!rotationResponse.ok) {
      throw new Error(`Failed to fetch champion rotation: ${rotationResponse.statusText}`);
    }
    
    const rotationData: ChampionInfo = await rotationResponse.json();
    
    // Get champion data from Data Dragon (doesn't require API key)
    const latestVersion = await getLatestVersion();
    
    const championsResponse = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
    );
    
    if (!championsResponse.ok) {
      throw new Error(`Failed to fetch champion data: ${championsResponse.statusText}`);
    }
    
    const championsData = await championsResponse.json();
    const champions = Object.values(championsData.data) as Champion[];
    
    // Filter and map free rotation champions
    return rotationData.freeChampionIds
      .map(id => {
        const champion = champions.find(c => Number(c.key) === id);
        if (!champion) return null;
        
        return {
          id: champion.id,
          key: champion.key,
          name: champion.name,
          title: champion.title,
          imageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champion.image.full}`,
          roles: champion.tags || []
        };
      })
      .filter((champion): champion is ChampionData => champion !== null);
  } catch (error) {
    console.error('Error fetching champion rotation:', error);
    return [];
  }
};

// Function to fetch all champions with their roles
export const fetchAllChampions = async (): Promise<ChampionData[]> => {
  try {
    const latestVersion = await getLatestVersion();
    
    const championsResponse = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
    );
    
    if (!championsResponse.ok) {
      throw new Error(`Failed to fetch champion data: ${championsResponse.statusText}`);
    }
    
    const championsData = await championsResponse.json();
    const champions = Object.values(championsData.data) as Champion[];
    
    // Map all champions to our ChampionData format
    return champions.map(champion => ({
      id: champion.id,
      key: champion.key,
      name: champion.name,
      title: champion.title,
      imageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champion.image.full}`,
      roles: champion.tags || []
    }));
  } catch (error) {
    console.error('Error fetching all champions:', error);
    return [];
  }
};

// Simulate PNW server data (since there's no actual PNW-specific API endpoint)
export const fetchPNWServerStatus = async (): Promise<ServerStatus[]> => {
  try {
    // Get platform data from Riot API
    const platformResponse = await fetch(
      `https://${REGION}.api.riotgames.com/lol/status/v4/platform-data?api_key=${API_KEY}`
    );
    
    if (!platformResponse.ok) {
      throw new Error(`Failed to fetch platform data: ${platformResponse.statusText}`);
    }
    
    // For demo purposes, simulate PNW servers based on the real NA data
    // In a real app, you would use actual API data specific to PNW if available
    const platformData = await platformResponse.json();
    
    // Create simulated PNW server status based on the platform data
    const pnwServers: ServerStatus[] = [
      {
        name: 'PNW Game Server',
        status: 'online',
        ping: Math.floor(Math.random() * 30) + 15, // Random ping between 15-45ms
        incidents: platformData.incidents.filter((_: any, i: number) => i < 2).map((incident: any, id: number) => ({
          id,
          title: `${incident.titles?.[0]?.content || 'Incident'}`,
          severity: ['warning', 'critical', 'info'][Math.floor(Math.random() * 3)] as 'warning' | 'critical' | 'info',
          created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
          updated_at: new Date().toISOString(),
          platforms: ['Windows', 'macOS'],
          description: incident.updates?.[0]?.translations?.[0]?.content || 'No details available'
        }))
      },
      {
        name: 'PNW Chat Service',
        status: 'online',
        ping: Math.floor(Math.random() * 20) + 10, // Random ping between 10-30ms
        incidents: []
      },
      {
        name: 'PNW Matchmaking',
        status: 'online',
        ping: Math.floor(Math.random() * 25) + 20, // Random ping between 20-45ms
        incidents: []
      },
      {
        name: 'PNW Team Builder',
        status: Math.random() > 0.8 ? 'unstable' : 'online', // 20% chance of being unstable
        ping: Math.floor(Math.random() * 40) + 30, // Random ping between 30-70ms
        incidents: Math.random() > 0.7 ? [{
          id: 1,
          title: 'Intermittent Connection Issues',
          severity: 'warning',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date().toISOString(),
          platforms: ['Windows', 'macOS'],
          description: 'Some players may experience longer queue times when using Team Builder. Our engineers are investigating.'
        }] : []
      }
    ];
    
    return pnwServers;
  } catch (error) {
    console.error('Error fetching PNW server status:', error);
    return [];
  }
};

export interface SummonerInfo {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface MatchHistory {
  matches: string[];
  totalGames: number;
  startIndex: number;
  endIndex: number;
}

export interface Match {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    participants: Participant[];
    platformId: string;
    queueId: number;
    teams: Team[];
    tournamentCode: string;
  };
}

export interface Participant {
  assists: number;
  baronKills: number;
  bountyLevel: number;
  champExperience: number;
  champLevel: number;
  championId: number;
  championName: string;
  damageDealtToBuildings: number;
  damageDealtToObjectives: number;
  damageDealtToTurrets: number;
  damageSelfMitigated: number;
  deaths: number;
  detectorWardsPlaced: number;
  doubleKills: number;
  dragonKills: number;
  firstBloodAssist: boolean;
  firstBloodKill: boolean;
  firstTowerAssist: boolean;
  firstTowerKill: boolean;
  gameEndedInEarlySurrender: boolean;
  gameEndedInSurrender: boolean;
  goldEarned: number;
  goldSpent: number;
  individualPosition: string;
  inhibitorKills: number;
  inhibitorTakedowns: number;
  inhibitorLost: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  itemsPurchased: number;
  killingSprees: number;
  kills: number;
  lane: string;
  largestCriticalStrike: number;
  largestKillingSpree: number;
  largestMultiKill: number;
  longestTimeSpentLiving: number;
  magicDamageDealt: number;
  magicDamageDealtToChampions: number;
  magicDamageTaken: number;
  neutralMinionsKilled: number;
  nexusKills: number;
  nexusLost: number;
  objectivesStolen: number;
  objectivesStolenAssists: number;
  participantId: number;
  pentaKills: number;
  physicalDamageDealt: number;
  physicalDamageDealtToChampions: number;
  physicalDamageTaken: number;
  profileIcon: number;
  puuid: string;
  quadraKills: number;
  riotIdName: string;
  riotIdTagline: string;
  role: string;
  sightWardsBoughtInGame: number;
  spell1Casts: number;
  spell2Casts: number;
  spell3Casts: number;
  spell4Casts: number;
  summoner1Casts: number;
  summoner1Id: number;
  summoner2Casts: number;
  summoner2Id: number;
  summonerId: string;
  summonerLevel: number;
  summonerName: string;
  teamEarlySurrendered: boolean;
  teamId: number;
  teamPosition: string;
  timeCCingOthers: number;
  timePlayed: number;
  totalDamageDealt: number;
  totalDamageDealtToChampions: number;
  totalDamageShieldedOnTeammates: number;
  totalDamageTaken: number;
  totalHeal: number;
  totalHealsOnTeammates: number;
  totalMinionsKilled: number;
  totalTimeCCDealt: number;
  totalTimeSpentDead: number;
  totalUnitsHealed: number;
  tripleKills: number;
  trueDamageDealt: number;
  trueDamageDealtToChampions: number;
  trueDamageTaken: number;
  turretKills: number;
  turretTakedowns: number;
  turretsLost: number;
  unrealKills: number;
  visionScore: number;
  visionWardsBoughtInGame: number;
  wardsKilled: number;
  wardsPlaced: number;
  win: boolean;
}

export interface Team {
  bans: {
    championId: number;
    pickTurn: number;
  }[];
  objectives: {
    baron: {
      first: boolean;
      kills: number;
    };
    champion: {
      first: boolean;
      kills: number;
    };
    dragon: {
      first: boolean;
      kills: number;
    };
    inhibitor: {
      first: boolean;
      kills: number;
    };
    riftHerald: {
      first: boolean;
      kills: number;
    };
    tower: {
      first: boolean;
      kills: number;
    };
  };
  teamId: number;
  win: boolean;
}

export const fetchSummonerInfo = async (summonerName: string): Promise<SummonerInfo | null> => {
  try {
    // Split the Riot ID into name and tag
    const [name, tag] = summonerName.split('#');
    
    // First, get the PUUID using the Riot ID
    const accountResponse = await fetch(
      `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${API_KEY}`
    );
    
    if (!accountResponse.ok) {
      throw new Error(`Failed to fetch account info: ${accountResponse.statusText}`);
    }
    
    const accountData = await accountResponse.json();
    
    // Then, get the summoner info using the PUUID
    const summonerResponse = await fetch(
      `https://${REGION}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}?api_key=${API_KEY}`
    );
    
    if (!summonerResponse.ok) {
      throw new Error(`Failed to fetch summoner info: ${summonerResponse.statusText}`);
    }
    
    return await summonerResponse.json();
  } catch (error) {
    console.error('Error fetching summoner info:', error);
    return null;
  }
};

export const fetchMatchHistory = async (puuid: string, count: number = 10): Promise<MatchHistory> => {
  try {
    const response = await fetch(
      `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}&api_key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch match history: ${response.statusText}`);
    }
    
    const matches = await response.json();
    return {
      matches,
      totalGames: matches.length,
      startIndex: 0,
      endIndex: matches.length - 1
    };
  } catch (error) {
    console.error('Error fetching match history:', error);
    return {
      matches: [],
      totalGames: 0,
      startIndex: 0,
      endIndex: 0
    };
  }
};

export const fetchMatchDetails = async (matchId: string): Promise<Match | null> => {
  try {
    const response = await fetch(
      `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch match details: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching match details:', error);
    return null;
  }
};

export interface Server {
  id: string;
  name: string;
  region: string;
  status: 'online' | 'offline' | 'issues';
  ping: number;
  location: string;
  lastUpdated: Date;
  details: {
    gameServer: string;
    chatService: string;
    matchmaking: string;
    teamBuilder: string;
  };
}

export const fetchAllServers = async (): Promise<Server[]> => {
  try {
    const response = await fetch(
      `https://${REGION}.api.riotgames.com/lol/status/v4/platform-data?api_key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch server data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Map the platform data to our server format
    return [
      {
        id: 'pnw',
        name: 'Pacific Northwest',
        region: 'PNW',
        status: data.status === 'online' ? 'online' : 'issues',
        ping: Math.floor(Math.random() * 20) + 10, // Lower ping for PNW
        location: 'Seattle, WA',
        lastUpdated: new Date(),
        details: {
          gameServer: 'PNW Game Server',
          chatService: 'PNW Chat Service',
          matchmaking: 'PNW Matchmaking',
          teamBuilder: 'PNW Team Builder'
        }
      },
      {
        id: 'nyc',
        name: 'New York City',
        region: 'NYC',
        status: data.status === 'online' ? 'online' : 'issues',
        ping: Math.floor(Math.random() * 30) + 15, // Slightly higher ping for NYC
        location: 'New York City, NY',
        lastUpdated: new Date(),
        details: {
          gameServer: 'NYC Game Server',
          chatService: 'NYC Chat Service',
          matchmaking: 'NYC Matchmaking',
          teamBuilder: 'NYC Team Builder'
        }
      }
    ];
  } catch (error) {
    console.error('Error fetching servers:', error);
    return [];
  }
};

export interface SummonerSuggestion {
  name: string;
  tag: string;
  puuid: string;
}

export async function fetchSummonerSuggestions(partialName: string): Promise<SummonerSuggestion[]> {
  try {
    // First, try to get account info using the partial name
    const response = await fetch(
      `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${partialName}/NA1?api_key=${API_KEY}`
    );

    if (!response.ok) {
      return [];
    }

    const accountData = await response.json();
    
    // If we found a match, return it as a suggestion
    return [{
      name: accountData.gameName,
      tag: accountData.tagLine,
      puuid: accountData.puuid
    }];
  } catch (error) {
    console.error('Error fetching summoner suggestions:', error);
    return [];
  }
}

export interface RankInfo {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId: string;
  summonerName: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export const fetchSummonerRank = async (summonerId: string): Promise<RankInfo[]> => {
  try {
    const response = await fetch(
      `https://${REGION}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch summoner rank: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching summoner rank:', error);
    return [];
  }
}; 